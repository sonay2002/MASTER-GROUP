import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from getpass import getpass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from http.cookies import SimpleCookie


APP_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = Path(os.environ.get("MASTER_GROUP_DB", Path.home() / ".local/share/master-group/data.sqlite3"))
MAX_BODY = 20 * 1024 * 1024
FIREBASE_SOURCE = (APP_ROOT / "js/firebase-client.js").read_text(encoding="utf-8")
API_KEY = os.environ.get("MG_FIREBASE_API_KEY") or re.search(r"apiKey:\s*'([^']+)'", FIREBASE_SOURCE).group(1)
PROJECT_ID = os.environ.get("MG_FIREBASE_PROJECT_ID") or re.search(r"projectId:\s*'([^']+)'", FIREBASE_SOURCE).group(1)
LOCK = threading.RLock()
TOKEN_CACHE = {}
LOGIN_FAILURES = {}
PASSWORD_ROUNDS = 310000
SESSION_SECONDS = 30 * 24 * 60 * 60


def open_db():
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_PATH.exists():
        DATA_PATH.touch(mode=0o600)
    os.chmod(DATA_PATH, 0o600)
    connection = sqlite3.connect(DATA_PATH, timeout=30)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, data TEXT NOT NULL, migration_done INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0)")
    columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
    if "updated_at" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0")
    connection.execute("CREATE TABLE IF NOT EXISTS auth_users (uid TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, salt BLOB NOT NULL, password_hash BLOB NOT NULL, created_at INTEGER NOT NULL)")
    connection.execute("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, uid TEXT NOT NULL, expires_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL DEFAULT 0)")
    session_columns = {row[1] for row in connection.execute("PRAGMA table_info(sessions)")}
    if "last_seen_at" not in session_columns:
        connection.execute("ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0")
    connection.execute("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, message TEXT NOT NULL, occurred_at INTEGER NOT NULL, amount INTEGER NOT NULL DEFAULT 1)")
    connection.commit()
    return connection


def auth_uid(handler):
    cookies = SimpleCookie()
    cookies.load(handler.headers.get("Cookie", ""))
    morsel = cookies.get("mg_session")
    if not morsel:
        raise PermissionError("Authentication required")
    token_hash = hashlib.sha256(morsel.value.encode()).hexdigest()
    with LOCK:
        connection = open_db()
        try:
            row = connection.execute("SELECT uid,expires_at,last_seen_at FROM sessions WHERE token_hash=?", (token_hash,)).fetchone()
            now = int(time.time())
            if not row or row[1] <= now:
                connection.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash,))
                connection.commit()
                raise PermissionError("Session expired. Sign in again.")
            if row[2] < now - 10:
                connection.execute("UPDATE sessions SET last_seen_at=? WHERE token_hash=?", (now, token_hash))
                connection.commit()
            return row[0]
        finally:
            connection.close()


def resolve_path(uid, path):
    parts = [part for part in str(path or "").split("/") if part]
    if parts == [".info", "connected"]:
        return parts
    if len(parts) < 2 or parts[0] != "users" or parts[1] != uid:
        raise PermissionError("User data path is not allowed")
    if any(part in (".", "..") or any(char in part for char in ".#$[]") for part in parts):
        raise ValueError("Invalid data path")
    return parts[2:]


def tree_get(tree, parts):
    current = tree
    for part in parts:
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def tree_set(tree, parts, value):
    if not parts:
        if not isinstance(value, dict):
            raise ValueError("Root data must be an object")
        tree.clear()
        tree.update(value)
        return
    current = tree
    for part in parts[:-1]:
        next_value = current.get(part)
        if not isinstance(next_value, dict):
            next_value = {}
            current[part] = next_value
        current = next_value
    if value is None:
        current.pop(parts[-1], None)
    else:
        current[parts[-1]] = value


class Handler(BaseHTTPRequestHandler):
    server_version = "MasterGroup/1"

    def log_message(self, fmt, *args):
        return

    def json_response(self, status, value):
        payload = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def set_session_cookie(self, token, max_age):
        self.send_header("Set-Cookie", f"mg_session={token}; Path=/; Max-Age={max_age}; HttpOnly; Secure; SameSite=Strict")

    def session_user(self):
        uid = auth_uid(self)
        connection = open_db()
        try:
            row = connection.execute("SELECT email FROM auth_users WHERE uid=?", (uid,)).fetchone()
            if not row:
                raise PermissionError("Account no longer exists")
            return {"uid": uid, "email": row[0]}
        finally:
            connection.close()

    def read_json(self):
        size = int(self.headers.get("Content-Length", "0"))
        if size < 0 or size > MAX_BODY:
            raise ValueError("Request body is too large")
        return json.loads(self.rfile.read(size) or b"{}")

    def data_for(self, uid):
        connection = open_db()
        try:
            row = connection.execute("SELECT data, migration_done FROM users WHERE uid=?", (uid,)).fetchone()
            if row:
                return json.loads(row[0]), bool(row[1])
            return {}, False
        finally:
            connection.close()

    def save_data(self, uid, tree, migration_done=None):
        connection = open_db()
        try:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute("SELECT data,migration_done FROM users WHERE uid=?", (uid,)).fetchone()
            old_tree = json.loads(row[0]) if row else {}
            done = int(bool(row[1])) if row else 0
            imported_now = migration_done is True and not done and not old_tree
            if migration_done is not None:
                done = int(bool(migration_done))
            connection.execute("INSERT INTO users(uid,data,migration_done,updated_at) VALUES(?,?,?,?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data,migration_done=excluded.migration_done,updated_at=excluded.updated_at", (uid, json.dumps(tree, ensure_ascii=False, separators=(",", ":")), done, int(time.time() * 1000)))
            now = int(time.time() * 1000)
            if imported_now:
                estimates = tree.get("estimates") if isinstance(tree.get("estimates"), dict) else {}
                amount = sum(1 for item in estimates.values() if isinstance(item, dict) and not item.get("_deleted") and not item.get("_purged"))
                if amount:
                    connection.execute("INSERT INTO events(uid,kind,label,message,occurred_at,amount) VALUES(?,?,?,?,?,?)", (uid, "import", "Сметы", f"Перенесено смет из прежнего хранилища: {amount}", now, amount))
            else:
                old_estimates = old_tree.get("estimates") if isinstance(old_tree.get("estimates"), dict) else {}
                new_estimates = tree.get("estimates") if isinstance(tree.get("estimates"), dict) else {}
                for estimate_id in old_estimates.keys() | new_estimates.keys():
                    before = old_estimates.get(estimate_id)
                    after = new_estimates.get(estimate_id)
                    before = before if isinstance(before, dict) else None
                    after = after if isinstance(after, dict) else None
                    before_active = bool(before and not before.get("_deleted") and not before.get("_purged"))
                    after_active = bool(after and not after.get("_deleted") and not after.get("_purged"))
                    label = str((after or before or {}).get("number") or str(estimate_id)[:8])
                    kind = None
                    action = None
                    if after_active and not before_active:
                        kind, action = ("saved", "сохранена") if not before else ("restored", "восстановлена")
                    elif before_active and not after_active:
                        kind, action = ("deleted", "удалена") if after else ("purged", "удалена навсегда")
                    elif before_active and after_active and before != after:
                        kind, action = "updated", "обновлена"
                    if kind:
                        connection.execute("INSERT INTO events(uid,kind,label,message,occurred_at,amount) VALUES(?,?,?,?,?,1)", (uid, kind, label, f"Смета {label} {action}", now))
                if old_tree.get("catalog") != tree.get("catalog"):
                    connection.execute("INSERT INTO events(uid,kind,label,message,occurred_at,amount) VALUES(?,?,?,?,?,1)", (uid, "catalog", "Каталог", "Каталог направлений обновлён", now))
                if old_tree.get("company") != tree.get("company"):
                    connection.execute("INSERT INTO events(uid,kind,label,message,occurred_at,amount) VALUES(?,?,?,?,?,1)", (uid, "company", "Компания", "Данные компании обновлены", now))
            connection.commit()
        finally:
            connection.close()

    def api(self, method):
        parsed = urllib.parse.urlsplit(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        if parsed.path == "/api/health" and method == "GET":
            self.json_response(200, {"ok": True})
            return
        if parsed.path == "/api/auth/register" and method == "POST":
            payload = self.read_json()
            email = str(payload.get("email", "")).strip().lower()
            password = str(payload.get("password", ""))
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                self.json_response(400, {"error": "Введите корректный email."})
                return
            if len(password) < 8:
                self.json_response(400, {"error": "Пароль должен содержать не менее 8 символов."})
                return
            uid = str(uuid.uuid4())
            salt = secrets.token_bytes(16)
            password_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ROUNDS)
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            now = int(time.time())
            expires = now + SESSION_SECONDS
            with LOCK:
                connection = open_db()
                try:
                    try:
                        connection.execute("INSERT INTO auth_users(uid,email,salt,password_hash,created_at) VALUES(?,?,?,?,?)", (uid, email, salt, password_hash, now))
                    except sqlite3.IntegrityError:
                        self.json_response(409, {"error": "Аккаунт с таким email уже существует. Войдите в него."})
                        return
                    connection.execute("INSERT INTO sessions(token_hash,uid,expires_at,last_seen_at) VALUES(?,?,?,?)", (token_hash, uid, expires, now))
                    connection.commit()
                finally:
                    connection.close()
            self.send_response(201)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.set_session_cookie(token, SESSION_SECONDS)
            body = json.dumps({"user": {"uid": uid, "email": email}}, ensure_ascii=False).encode()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == "/api/auth/login" and method == "POST":
            payload = self.read_json()
            email = str(payload.get("email", "")).strip().lower()
            password = str(payload.get("password", ""))
            if not email or len(password) < 1:
                self.json_response(400, {"error": "Введите email и пароль."})
                return
            failure = LOGIN_FAILURES.get(email)
            if failure and failure[0] >= 5 and failure[1] > time.time():
                self.json_response(429, {"error": "Слишком много попыток входа. Подождите 15 минут."})
                return
            with LOCK:
                connection = open_db()
                try:
                    row = connection.execute("SELECT uid,salt,password_hash FROM auth_users WHERE email=?", (email,)).fetchone()
                    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), row[1], PASSWORD_ROUNDS) if row else b""
                    valid = bool(row and hmac.compare_digest(candidate, row[2]))
                    if valid:
                        LOGIN_FAILURES.pop(email, None)
                        token = secrets.token_urlsafe(32)
                        token_hash = hashlib.sha256(token.encode()).hexdigest()
                        expires = int(time.time()) + SESSION_SECONDS
                        connection.execute("INSERT INTO sessions(token_hash,uid,expires_at,last_seen_at) VALUES(?,?,?,?)", (token_hash, row[0], expires, int(time.time())))
                        connection.commit()
                    else:
                        count = (failure[0] if failure and failure[1] > time.time() else 0) + 1
                        LOGIN_FAILURES[email] = (count, time.time() + 900 if count >= 5 else time.time() + 900)
                        token = None
                finally:
                    connection.close()
            if not token:
                self.json_response(401, {"error": "Неверный email или пароль."})
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.set_session_cookie(token, SESSION_SECONDS)
            body = json.dumps({"user": {"uid": row[0], "email": email}}, ensure_ascii=False).encode()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == "/api/auth/session" and method == "GET":
            self.json_response(200, {"user": self.session_user()})
            return
        if parsed.path == "/api/auth/logout" and method == "POST":
            cookies = SimpleCookie()
            cookies.load(self.headers.get("Cookie", ""))
            morsel = cookies.get("mg_session")
            if morsel:
                digest = hashlib.sha256(morsel.value.encode()).hexdigest()
                with LOCK:
                    connection = open_db()
                    connection.execute("DELETE FROM sessions WHERE token_hash=?", (digest,))
                    connection.commit()
                    connection.close()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.set_session_cookie("", 0)
            body = b'{"ok":true}'
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        uid = None if parsed.path == "/api/monitor/stats" and method == "GET" else auth_uid(self)
        if parsed.path == "/api/monitor/stats" and method == "GET":
            host = self.headers.get("Host", "").split(":", 1)[0].strip("[]").lower()
            if host not in ("127.0.0.1", "localhost"):
                self.json_response(403, {"error": "Monitor is available only on the Acer screen"})
                return
            connection = open_db()
            try:
                users = connection.execute("SELECT uid,data,updated_at FROM users").fetchall()
                totals = {"estimates": 0, "trash": 0, "catalogDirections": 0, "notifications": 0, "companySaved": 0, "updatedAt": 0}
                now = int(time.time())
                totals["onlineUsers"] = connection.execute("SELECT COUNT(DISTINCT uid) FROM sessions WHERE expires_at>? AND last_seen_at>=?", (now, now - 90)).fetchone()[0]
                totals["registeredUsers"] = connection.execute("SELECT COUNT(*) FROM auth_users").fetchone()[0]
                for uid, raw_data, updated_at in users:
                    tree = json.loads(raw_data)
                    estimates = tree.get("estimates") if isinstance(tree.get("estimates"), dict) else {}
                    active_count = sum(1 for item in estimates.values() if isinstance(item, dict) and not item.get("_deleted") and not item.get("_purged"))
                    if active_count and not connection.execute("SELECT 1 FROM events WHERE uid=? AND kind IN ('saved','import','baseline') LIMIT 1", (uid,)).fetchone():
                        at = int(time.time() * 1000)
                        connection.execute("INSERT INTO events(uid,kind,label,message,occurred_at,amount) VALUES(?,?,?,?,?,?)", (uid, "baseline", "Текущая база", f"Уже сохранено смет на момент запуска монитора: {active_count}", at, active_count))
                    totals["estimates"] += active_count
                    totals["trash"] += sum(1 for item in estimates.values() if isinstance(item, dict) and item.get("_deleted") and not item.get("_purged"))
                    catalog = tree.get("catalog") if isinstance(tree.get("catalog"), dict) else {}
                    totals["catalogDirections"] += len(catalog.get("data")) if isinstance(catalog.get("data"), list) else 0
                    notifications = tree.get("notifications") if isinstance(tree.get("notifications"), dict) else {}
                    totals["notifications"] += len(notifications)
                    totals["companySaved"] += int(bool(tree.get("company")))
                    totals["updatedAt"] = max(totals["updatedAt"], int(updated_at or 0))
                connection.commit()
                recent = connection.execute("SELECT kind,label,message,occurred_at FROM events ORDER BY id DESC LIMIT 12").fetchall()
                event_totals = {row[0]: int(row[1]) for row in connection.execute("SELECT kind,SUM(amount) FROM events GROUP BY kind").fetchall()}
                account_rows = connection.execute("""
                    SELECT a.uid,a.email,COALESCE(u.data,'{}'),
                        MAX(CASE WHEN s.expires_at>? AND s.last_seen_at>=? THEN s.last_seen_at ELSE 0 END) AS last_active
                    FROM auth_users a
                    LEFT JOIN users u ON u.uid=a.uid
                    LEFT JOIN sessions s ON s.uid=a.uid
                    GROUP BY a.uid
                    ORDER BY last_active DESC,a.created_at ASC
                """, (now, now - 90)).fetchall()
            finally:
                connection.close()
            totals["savedTotal"] = event_totals.get("saved", 0) + event_totals.get("import", 0) + event_totals.get("baseline", 0)
            totals["deletedTotal"] = event_totals.get("deleted", 0) + event_totals.get("purged", 0)
            totals["recent"] = [{"kind": kind, "label": label, "message": message, "occurredAt": at} for kind, label, message, at in recent]
            accounts = []
            for uid, email, raw_data, last_active in account_rows:
                tree = json.loads(raw_data)
                estimates = tree.get("estimates") if isinstance(tree.get("estimates"), dict) else {}
                catalog = tree.get("catalog") if isinstance(tree.get("catalog"), dict) else {}
                local_part, _, domain = str(email).partition("@")
                accounts.append({
                    "label": f"{local_part[:1]}***@{domain}" if domain else "Аккаунт",
                    "estimates": sum(1 for item in estimates.values() if isinstance(item, dict) and not item.get("_deleted") and not item.get("_purged")),
                    "trash": sum(1 for item in estimates.values() if isinstance(item, dict) and item.get("_deleted") and not item.get("_purged")),
                    "catalogDirections": len(catalog.get("data")) if isinstance(catalog.get("data"), list) else 0,
                    "online": int(bool(last_active)),
                })
            totals["accounts"] = accounts
            self.json_response(200, totals)
            return
        if parsed.path == "/api/migration/status" and method == "GET":
            with LOCK:
                _, done = self.data_for(uid)
            self.json_response(200, {"done": done})
            return
        if parsed.path == "/api/migration/firebase" and method == "POST":
            payload = self.read_json()
            with LOCK:
                tree, done = self.data_for(uid)
                if not done:
                    imported = payload.get("data")
                    if not isinstance(imported, dict):
                        raise ValueError("Firebase migration payload must be an object")
                    if not tree:
                        tree = imported
                    self.save_data(uid, tree, True)
            self.json_response(200, {"done": True})
            return
        if parsed.path == "/api/next-estimate-number" and method == "POST":
            with LOCK:
                tree, done = self.data_for(uid)
                estimates = tree_get(tree, ["estimates"]) or {}
                maximum = 0
                if isinstance(estimates, dict):
                    for estimate in estimates.values():
                        if isinstance(estimate, dict):
                            match = re.match(r"^MG-(\d+)$", str(estimate.get("number", "")), re.I)
                            if match:
                                maximum = max(maximum, int(match.group(1)))
                meta = tree_get(tree, ["_meta"]) or {}
                number = max(maximum, int(meta.get("estimateNumber", 0) or 0)) + 1
                tree_set(tree, ["_meta", "estimateNumber"], number)
                self.save_data(uid, tree, done)
            self.json_response(200, {"number": number})
            return
        if parsed.path != "/api/tree":
            self.json_response(404, {"error": "Not found"})
            return
        path = query.get("path", [""])[0]
        parts = resolve_path(uid, path)
        if parts == [".info", "connected"] and method == "GET":
            self.json_response(200, {"value": True})
            return
        with LOCK:
            tree, done = self.data_for(uid)
            if method == "GET":
                self.json_response(200, {"value": tree_get(tree, parts)})
                return
            payload = self.read_json() if method in ("PUT", "PATCH") else None
            if method == "PUT":
                tree_set(tree, parts, payload.get("value"))
            elif method == "PATCH":
                if not isinstance(payload.get("value"), dict):
                    raise ValueError("PATCH value must be an object")
                current = tree_get(tree, parts)
                if not isinstance(current, dict):
                    current = {}
                current.update(payload["value"])
                tree_set(tree, parts, current)
            elif method == "DELETE":
                tree_set(tree, parts, None)
            else:
                self.json_response(405, {"error": "Method not allowed"})
                return
            self.save_data(uid, tree, done)
            self.json_response(200, {"value": tree_get(tree, parts)})

    def do_api(self, method):
        try:
            self.api(method)
        except PermissionError as error:
            self.json_response(401, {"error": str(error)})
        except (ValueError, json.JSONDecodeError) as error:
            self.json_response(400, {"error": str(error)})
        except Exception:
            import traceback
            traceback.print_exc()
            self.json_response(500, {"error": "Server error"})

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.do_api("GET")
            return
        self.serve_static()

    def do_PUT(self):
        self.do_api("PUT")

    def do_PATCH(self):
        self.do_api("PATCH")

    def do_DELETE(self):
        self.do_api("DELETE")

    def do_POST(self):
        self.do_api("POST")

    def serve_static(self):
        raw_path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        relative = raw_path.lstrip("/") or "index.html"
        target = (APP_ROOT / relative).resolve()
        if raw_path.rstrip("/") == "/monitor":
            target = APP_ROOT / "server" / "monitor.html"
        if not target.is_relative_to(APP_ROOT) or not target.is_file():
            self.send_error(404)
            return
        content = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(content)


def main():
    if len(os.sys.argv) > 1 and os.sys.argv[1] in ("create-user", "set-password"):
        if os.geteuid() != 0 and not os.access(DATA_PATH.parent, os.W_OK):
            raise SystemExit("No permission to write the Acer database")
        email = input("Account email: ").strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise SystemExit("Enter a valid email address")
        password = getpass("New password (8+ characters): ")
        if len(password) < 8:
            raise SystemExit("Password must be at least 8 characters")
        confirmation = getpass("Repeat password: ")
        if password != confirmation:
            raise SystemExit("Passwords do not match")
        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ROUNDS)
        uid = str(uuid.uuid4())
        connection = open_db()
        try:
            if os.sys.argv[1] == "set-password":
                existing = connection.execute("SELECT uid FROM auth_users WHERE email=?", (email,)).fetchone()
                if not existing:
                    raise SystemExit("No local account with that email")
                uid = existing[0]
                connection.execute("UPDATE auth_users SET salt=?,password_hash=? WHERE uid=?", (salt, digest, uid))
                connection.execute("DELETE FROM sessions WHERE uid=?", (uid,))
            else:
                connection.execute("INSERT INTO auth_users(uid,email,salt,password_hash,created_at) VALUES(?,?,?,?,?)", (uid, email, salt, digest, int(time.time())))
            connection.commit()
            print("Acer account ready.")
        finally:
            connection.close()
        return
    address = os.environ.get("MASTER_GROUP_BIND", "127.0.0.1")
    port = int(os.environ.get("MASTER_GROUP_PORT", "8080"))
    open_db().close()
    server = ThreadingHTTPServer((address, port), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Non-destructive integration test for local auth and estimate revision checks."""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def request(base: str, path: str, method: str = "GET", body=None, cookie: str | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = cookie
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, response.headers, json.loads(response.read() or b"{}")
    except urllib.error.HTTPError as error:
        return error.code, error.headers, json.loads(error.read() or b"{}")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="mg-offline-e2e-") as temp_dir:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        db_path = Path(temp_dir) / "test.sqlite3"
        env = os.environ.copy()
        env["MASTER_GROUP_DB"] = str(db_path)
        env["MASTER_GROUP_BIND"] = "127.0.0.1"
        env["MASTER_GROUP_PORT"] = str(port)
        process = subprocess.Popen(
            [sys.executable, str(ROOT / "server" / "app.py")],
            cwd=ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        base = f"http://127.0.0.1:{port}"
        try:
            for _ in range(80):
                if process.poll() is not None:
                    error = process.stderr.read() if process.stderr else ""
                    raise AssertionError(f"Test server exited early: {error}")
                try:
                    status, _, health = request(base, "/api/health")
                    if status == 200 and health.get("ok"):
                        break
                except Exception:
                    time.sleep(0.15)
            else:
                raise AssertionError("Temporary test server did not start")

            email = "offline-e2e@example.invalid"
            password = "TestPassword!234"
            status, headers, created = request(
                base, "/api/auth/register", "POST", {"email": email, "password": password}
            )
            assert status == 201, (status, created)
            uid = created["user"]["uid"]
            cookie_a = headers.get("Set-Cookie", "").split(";", 1)[0]
            assert cookie_a.startswith("mg_session=")

            status, headers, logged_in = request(
                base, "/api/auth/login", "POST", {"email": email, "password": password}
            )
            assert status == 200, (status, logged_in)
            cookie_b = headers.get("Set-Cookie", "").split(";", 1)[0]
            assert cookie_b.startswith("mg_session=") and cookie_b != cookie_a

            estimate = {"id": "revision-test", "number": "MG-0001", "client": "Device A"}
            status, _, saved = request(
                base,
                "/api/estimate/write",
                "POST",
                {"id": estimate["id"], "value": estimate, "expectedRevision": 0},
                cookie_a,
            )
            assert status == 200 and saved["value"]["_serverRevision"] == 1, (status, saved)

            stale = {**estimate, "client": "Stale edit from device B"}
            status, _, conflict = request(
                base,
                "/api/estimate/write",
                "POST",
                {"id": stale["id"], "value": stale, "expectedRevision": 0},
                cookie_b,
            )
            assert status == 409 and conflict.get("currentRevision") == 1, (status, conflict)
            status, _, current = request(
                base,
                f"/api/tree?path=users/{uid}/estimates/{estimate['id']}",
                cookie=cookie_b,
            )
            assert status == 200 and current["value"]["client"] == "Device A", (status, current)

            resolved = {**estimate, "client": "Resolved edit from device B", "_serverRevision": 1}
            status, _, saved_again = request(
                base,
                "/api/estimate/write",
                "POST",
                {"id": resolved["id"], "value": resolved, "expectedRevision": 1},
                cookie_b,
            )
            assert status == 200 and saved_again["value"]["_serverRevision"] == 2, (status, saved_again)

            print("PASS temporary server registration and authentication")
            print("PASS independent sessions for two devices")
            print("PASS create estimate with revision 1")
            print("PASS reject stale concurrent write with HTTP 409")
            print("PASS preserve newer server copy after rejected write")
            print("PASS accept an explicit resolved revision 2 write")
            print("Server revision integration: 6 scenarios passed")
            return 0
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


if __name__ == "__main__":
    raise SystemExit(main())

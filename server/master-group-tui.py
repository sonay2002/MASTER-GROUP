#!/usr/bin/python3
import curses
import json
import locale
import subprocess
import threading
import time
import urllib.request
from datetime import datetime

API_URL = "http://127.0.0.1:8080/api/monitor/stats"
REFRESH_SECONDS = 2


class DataSource:
    def __init__(self):
        self.lock = threading.Lock()
        self.data = None
        self.error = "Подключение к Master Group…"
        self.stop = threading.Event()

    def refresh(self):
        while not self.stop.is_set():
            try:
                request = urllib.request.Request(API_URL, headers={"Host": "127.0.0.1"})
                with urllib.request.urlopen(request, timeout=1.5) as response:
                    value = json.loads(response.read().decode("utf-8"))
                with self.lock:
                    self.data = value
                    self.error = ""
            except Exception as exc:
                with self.lock:
                    self.error = f"Нет связи с API: {exc}"
            self.stop.wait(REFRESH_SECONDS)

    def snapshot(self):
        with self.lock:
            return self.data, self.error


def put(screen, row, col, value, width, attr=0):
    height, columns = screen.getmaxyx()
    if 0 <= row < height and 0 <= col < columns and width > 0:
        try:
            screen.addnstr(row, col, str(value).replace("\n", " "), min(width, columns - col), attr)
        except curses.error:
            pass


def event_time(value):
    try:
        return datetime.fromtimestamp(int(value) / 1000).strftime("%H:%M:%S")
    except (TypeError, ValueError, OSError, OverflowError):
        return "--:--:--"


def run_command(screen, command):
    curses.def_prog_mode()
    curses.endwin()
    print(f"\n$ {command}\n", flush=True)
    try:
        subprocess.run(["/bin/bash", "-lc", command], check=False)
    except OSError as exc:
        print(f"Не удалось выполнить команду: {exc}")
    input("\nНажмите Enter, чтобы вернуться к монитору…")
    curses.reset_prog_mode()
    curses.curs_set(0)
    screen.clear()
    screen.refresh()


def draw(screen, source, command, notice, scroll):
    screen.erase()
    height, width = screen.getmaxyx()
    if height < 22 or width < 60:
        put(screen, 0, 0, "Увеличьте окно терминала: нужно не меньше 60×22", width)
        screen.refresh()
        return scroll

    data, error = source.snapshot()
    title = curses.color_pair(1) | curses.A_BOLD
    accent = curses.color_pair(2) | curses.A_BOLD
    muted = curses.color_pair(3)
    put(screen, 0, 2, "MASTER GROUP  /  СИСТЕМНЫЙ МОНИТОР", width - 4, title)
    put(screen, 1, 2, "ЛОКАЛЬНАЯ КОНСОЛЬ  •  обновление каждые 2 секунды", width - 4, muted)
    put(screen, 2, 0, "─" * width, width, accent)
    put(screen, 3, 2, "СЧЁТЧИКИ СМЕТ И КАТАЛОГА — СУММА ПО ВСЕМ АККАУНТАМ", width - 4, muted)

    events = []
    if data is not None:
        tiles = [
            ("СМЕТЫ", data.get("estimates", 0)),
            ("В КОРЗИНЕ", data.get("trash", 0)),
            ("НАПРАВЛЕНИЯ", data.get("catalogDirections", 0)),
            ("УВЕДОМЛЕНИЯ", data.get("notifications", 0)),
            ("КОМПАНИЯ", "есть" if data.get("companySaved") else "нет"),
            ("СОХРАНЕНО ВСЕГО", data.get("savedTotal", 0)),
            ("УДАЛЕНО ВСЕГО", data.get("deletedTotal", 0)),
        ]
        tile_width = max(14, (width - 4) // 4)
        for index, (label, value) in enumerate(tiles):
            row = 4 + (index // 4) * 3
            col = 2 + (index % 4) * tile_width
            put(screen, row, col, label, tile_width - 2, muted)
            put(screen, row + 1, col, value, tile_width - 2, accent)
        put(screen, 10, 2, f"ПОЛЬЗОВАТЕЛИ ОНЛАЙН: {data.get('onlineUsers', 0)}    •    ЗАРЕГИСТРИРОВАНО ВСЕГО: {data.get('registeredUsers', 0)}", width - 4, accent)
        accounts = data.get("accounts", [])
        put(screen, 11, 2, f"ПО АККАУНТАМ: показано {min(2, len(accounts))} из {len(accounts)}; итоги выше суммируют все", width - 4, title)
        put(screen, 12, 2, "АККАУНТ", 20, muted)
        put(screen, 12, 24, "СМЕТЫ", 7, muted)
        put(screen, 12, 34, "КОРЗИНА", 9, muted)
        put(screen, 12, 46, "НАПРАВЛЕНИЯ", 14, muted)
        for index, account in enumerate(accounts[:2]):
            row = 13 + index
            put(screen, row, 2, ("● " if account.get("online") else "  ") + account.get("label", "Аккаунт"), 20, accent if account.get("online") else muted)
            put(screen, row, 24, account.get("estimates", 0), 7)
            put(screen, row, 34, account.get("trash", 0), 9)
            put(screen, row, 46, account.get("catalogDirections", 0), 8)
        events = data.get("recent", [])
        put(screen, 15, 2, "ПОСЛЕДНИЕ СОБЫТИЯ ВСЕХ АККАУНТОВ", width - 4, title)
        put(screen, 16, 0, "─" * width, width, accent)
    else:
        put(screen, 4, 2, error, width - 4, curses.color_pair(4) | curses.A_BOLD)

    event_start = 17
    event_rows = max(0, height - 21)
    max_scroll = max(0, len(events) - event_rows)
    scroll = min(scroll, max_scroll)
    for index, event in enumerate(events[scroll:scroll + event_rows]):
        prefix = f"{event_time(event.get('occurredAt'))}  {event.get('kind', '').upper():<9}"
        put(screen, event_start + index, 2, prefix, 20, accent)
        put(screen, event_start + index, 22, event.get("message") or event.get("label") or "", width - 24)

    if error:
        put(screen, height - 4, 2, error, width - 4, curses.color_pair(4) | curses.A_BOLD)
    elif data is not None:
        put(screen, height - 4, 2, "API работает", width - 4, muted)
    if notice:
        put(screen, height - 3, 2, notice, width - 4, curses.A_BOLD)
    put(screen, height - 2, 2, "$ ", 2, accent)
    put(screen, height - 2, 4, command, width - 6, curses.A_BOLD)
    put(screen, height - 1, 2, "Enter — выполнить команду   ↑/↓ — события   Ctrl+C — выход", width - 4, muted)
    screen.move(height - 2, min(width - 1, 4 + len(command)))
    screen.refresh()
    return scroll


def main(screen):
    locale.setlocale(locale.LC_ALL, "")
    curses.curs_set(0)
    curses.noecho()
    curses.start_color()
    curses.use_default_colors()
    curses.init_pair(1, curses.COLOR_CYAN, -1)
    curses.init_pair(2, curses.COLOR_GREEN, -1)
    curses.init_pair(3, curses.COLOR_BLUE, -1)
    curses.init_pair(4, curses.COLOR_RED, -1)
    screen.keypad(True)
    screen.timeout(100)
    source = DataSource()
    threading.Thread(target=source.refresh, daemon=True).start()
    command = ""
    notice = ""
    scroll = 0
    try:
        while True:
            scroll = draw(screen, source, command, notice, scroll)
            notice = ""
            try:
                key = screen.get_wch()
            except curses.error:
                continue
            if key in ("\x03", "\x04"):
                return
            if key in ("\n", "\r", curses.KEY_ENTER):
                if command.strip():
                    run_command(screen, command)
                    command = ""
                    scroll = 0
            elif key in (curses.KEY_BACKSPACE, "\x7f", "\b"):
                command = command[:-1]
            elif key == curses.KEY_UP:
                scroll = max(0, scroll - 1)
            elif key == curses.KEY_DOWN:
                scroll += 1
            elif isinstance(key, str) and key.isprintable() and len(command) < 500:
                command += key
    finally:
        source.stop.set()


if __name__ == "__main__":
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        pass

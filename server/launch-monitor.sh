#!/bin/sh
set -eu

while ! /usr/bin/python3 -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8080/api/monitor/stats", timeout=2).read()' >/dev/null 2>&1; do
  sleep 2
done

if command -v xset >/dev/null 2>&1; then
  xset s off 2>/dev/null || true
  xset -dpms 2>/dev/null || true
  xset s noblank 2>/dev/null || true
fi

if command -v chromium >/dev/null 2>&1; then
  exec chromium --kiosk --no-first-run --disable-infobars http://127.0.0.1:8080/monitor
fi
if command -v chromium-browser >/dev/null 2>&1; then
  exec chromium-browser --kiosk --no-first-run --disable-infobars http://127.0.0.1:8080/monitor
fi
if command -v firefox >/dev/null 2>&1; then
  exec firefox --kiosk http://127.0.0.1:8080/monitor
fi

exit 1

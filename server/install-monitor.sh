#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  printf '%s\n' 'Запустите этот сценарий от root.' >&2
  exit 1
fi

app_dir=/home/master/MASTER-GROUP-main
if [ ! -f "$app_dir/server/monitor.html" ]; then
  printf '%s\n' "Не найден монитор: $app_dir/server/monitor.html" >&2
  exit 1
fi

if ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1 && ! command -v firefox >/dev/null 2>&1; then
  apt-get update
  apt-get install -y chromium
fi

install -m 755 "$app_dir/server/launch-monitor.sh" /usr/local/bin/master-group-monitor
install -d -m 755 -o master -g master /home/master/.config/autostart
install -m 644 -o master -g master "$app_dir/server/master-group-monitor.desktop" /home/master/.config/autostart/master-group-monitor.desktop
printf '%s\n' 'Монитор будет запускаться при следующем входе пользователя master в графический рабочий стол.'

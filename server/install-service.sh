#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  printf '%s\n' 'Запустите этот сценарий от root.' >&2
  exit 1
fi

app_dir=/home/master/MASTER-GROUP-main
if [ ! -f "$app_dir/server/app.py" ]; then
  printf '%s\n' "Не найден проект: $app_dir" >&2
  exit 1
fi

install -d -m 700 -o master -g master /var/lib/master-group
install -m 644 "$app_dir/server/master-group.service" /etc/systemd/system/master-group.service
systemctl daemon-reload
systemctl enable master-group
systemctl restart master-group
tailscale serve --bg 8080
systemctl --no-pager --full status master-group

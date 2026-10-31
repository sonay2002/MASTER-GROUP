#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  printf '%s\n' 'Запустите этот сценарий от root.' >&2
  exit 1
fi

action=${1:-}
case "$action" in
  create-user|set-password) ;;
  *) printf '%s\n' 'Использование: bash server/manage-account.sh create-user|set-password' >&2; exit 2 ;;
esac

runuser -u master -- env MASTER_GROUP_DB=/var/lib/master-group/data.sqlite3 /usr/bin/python3 /home/master/MASTER-GROUP-main/server/app.py "$action"

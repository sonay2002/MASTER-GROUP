#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  printf '%s\n' 'Запустите сценарий от root.' >&2
  exit 1
fi

app_dir=/home/master/MASTER-GROUP-main
tui_path=/usr/local/bin/master-group-tui.py
profile=/home/master/.profile
if [ -f /home/master/.bash_profile ]; then
  profile=/home/master/.bash_profile
elif [ -f /home/master/.bash_login ]; then
  profile=/home/master/.bash_login
fi

install -m 755 "$app_dir/server/master-group-tui.py" "$tui_path"
touch "$profile"
chown master:master "$profile"
if ! grep -Eq 'master-group-tui-autostart|MG_MASTER_GROUP_TUI_AUTOSTART=1' "$profile"; then
  cat >>"$profile" <<'PROFILE'

if [ -t 0 ] && [ "$(tty 2>/dev/null)" = "/dev/tty1" ] && [ -x /usr/local/bin/master-group-tui.py ]; then
  MG_MASTER_GROUP_TUI_AUTOSTART=1
  exec /usr/local/bin/master-group-tui.py
fi
PROFILE
fi

getty_dropin=/etc/systemd/system/getty@tty1.service.d/90-master-group-tui.conf
install -d -m 755 "$(dirname "$getty_dropin")"
cat >"$getty_dropin" <<'GETTY'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin master --noclear %I linux
GETTY
chmod 644 "$getty_dropin"
systemctl daemon-reload
printf '%s\n' 'TUI updated; reboot to load it on tty1.'

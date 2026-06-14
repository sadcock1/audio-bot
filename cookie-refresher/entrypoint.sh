#!/bin/bash

# Clean up stale lock files left by previous container runs
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
rm -f /data/profile/SingletonLock /data/profile/SingletonCookie /data/profile/SingletonSocket

# Start Xvfb and wait until its socket appears (more reliable than a fixed sleep)
Xvfb :99 -screen 0 1280x720x24 -ac &
until [ -e /tmp/.X11-unix/X99 ]; do sleep 0.1; done
export DISPLAY=:99

# VNC server
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -quiet &

# noVNC web proxy
python3 -m websockify --web=/usr/share/novnc/ 6080 127.0.0.1:5900 &

echo "[cookie-refresher] noVNC ready — open http://<VPS-TAILSCALE-IP>:6080/vnc.html"

# Initial export: wait up to 15 min for sign-in via noVNC (WAIT_FOR_LOGIN mode).
# If the burner account is already signed into the persistent profile, this exits immediately.
# If not signed in yet, open noVNC and sign in — then this will export and continue.
DISPLAY=:99 WAIT_FOR_LOGIN=1 node /app/refresh.js || \
  echo "[cookie-refresher] Initial export failed. If not signed in, use noVNC to sign in then run: docker compose exec cookie-refresher env WAIT_FOR_LOGIN=1 DISPLAY=:99 node /app/refresh.js"

# Schedule daily refresh at 03:00 UTC (cron mode — exits immediately if not signed in)
(crontab -l 2>/dev/null | grep -v "refresh.js"; \
  echo "0 3 * * * DISPLAY=:99 node /app/refresh.js >> /var/log/cookie-refresh.log 2>&1") | crontab -

exec cron -f

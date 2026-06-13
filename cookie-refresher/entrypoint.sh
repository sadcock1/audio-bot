#!/bin/bash
set -e

# Virtual framebuffer display
Xvfb :99 -screen 0 1280x720x24 -ac &
export DISPLAY=:99
sleep 1

# VNC server — no password, Tailscale handles access control
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -quiet &

# noVNC web proxy (browser-based VNC client)
python3 -m websockify --web=/usr/share/novnc/ 6080 127.0.0.1:5900 &

echo "[cookie-refresher] Ready — open http://<VPS-TAILSCALE-IP>:6080/vnc.html to sign in"

# Run immediately on startup
DISPLAY=:99 node /app/refresh.js

# Refresh every 5 days at 03:00 to keep the session alive
(crontab -l 2>/dev/null; echo "0 3 */5 * * DISPLAY=:99 node /app/refresh.js >> /var/log/cookie-refresh.log 2>&1") | crontab -

exec cron -f

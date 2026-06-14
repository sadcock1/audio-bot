#!/bin/bash

# Clean up stale lock files left by previous container runs
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
rm -f /data/profile/SingletonLock /data/profile/SingletonCookie /data/profile/SingletonSocket

# Start Xvfb and wait until its socket appears
Xvfb :99 -screen 0 1280x720x24 -ac &
until [ -e /tmp/.X11-unix/X99 ]; do sleep 0.1; done
export DISPLAY=:99

# VNC server
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -quiet &

# noVNC web proxy
python3 -m websockify --web=/usr/share/novnc/ 6080 127.0.0.1:5900 &

echo "[cookie-refresher] noVNC ready — open http://<VPS-TAILSCALE-IP>:6080/vnc.html"

# Run refresh.js — keeps Chromium open permanently and exports cookies every 24h.
# On first run with no session, waits up to 15 min for noVNC sign-in.
exec DISPLAY=:99 WAIT_FOR_LOGIN=1 node /app/refresh.js

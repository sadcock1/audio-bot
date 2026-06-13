#!/bin/sh
# Usage: ./refresh-cookies.sh user@100.x.x.x
# Exports fresh YouTube cookies from Chrome and uploads them to the VPS.
set -e

VPS="${1:?Usage: ./refresh-cookies.sh user@vps-tailscale-ip}"

echo "Exporting cookies from Chrome..."
yt-dlp --cookies-from-browser chrome \
       --cookies cookies.txt \
       --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

echo "Uploading to VPS..."
scp cookies.txt "$VPS":/opt/stacks/audio-bot/cookies.txt

echo "Restarting bot..."
ssh "$VPS" "cd /opt/stacks/audio-bot && docker compose restart"

echo "Done. Cookies refreshed."

#!/bin/sh
# Manual fallback: export YouTube cookies from Chrome and push to VPS.
# Normally the cookie-refresher container handles this automatically.
# Usage: ./refresh-cookies.sh user@100.x.x.x
set -e

VPS="${1:?Usage: ./refresh-cookies.sh user@vps-tailscale-ip}"

echo "Exporting cookies from Chrome..."
yt-dlp --cookies-from-browser chrome \
       --cookies /tmp/yt-cookies.txt \
       --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

echo "Uploading to VPS..."
ssh "$VPS" "mkdir -p /opt/stacks/audio-bot/cookies"
scp /tmp/yt-cookies.txt "$VPS":/opt/stacks/audio-bot/cookies/cookies.txt

echo "Restarting bot..."
ssh "$VPS" "cd /opt/stacks/audio-bot && docker compose restart bot"

rm /tmp/yt-cookies.txt
echo "Done."

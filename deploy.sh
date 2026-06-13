#!/bin/sh
# Run this on the VPS to update and restart the bot
set -e
cd "$(dirname "$0")"
git pull origin main
docker compose up -d --build
echo "Done."

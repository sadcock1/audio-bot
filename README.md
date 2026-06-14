# audio-bot

Discord music bot — plays YouTube audio to a voice channel.

**Stack:** discord.js v14 · yt-dlp → ffmpeg · youtube-sr · Docker Compose

---

## First-time VPS setup

### 1. Clone the repo

```sh
git clone https://github.com/sadcock1/audio-bot.git /opt/stacks/audio-bot
cd /opt/stacks/audio-bot
```

### 2. Create `.env`

Copy the example and fill in your values:

```sh
cp .env.example .env
nano .env
```

Required values:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Discord application ID |
| `GUILD_ID` | Your Discord server ID |
| `MUSIC_CHANNEL_ID` | Voice channel ID the bot will join |
| `SPOTIFY_CLIENT_ID` | Spotify API client ID (for Spotify link resolution) |
| `SPOTIFY_CLIENT_SECRET` | Spotify API client secret |

Optional:

| Variable | Description |
|---|---|
| `METRICS_BIND_IP` | IP to expose the metrics port on (default: `127.0.0.1`). Set to your Tailscale IP to access over Tailscale. |
| `METRICS_PORT` | Prometheus metrics port (default: `9090`) |
| `YT_PROXY` | SOCKS5 proxy for yt-dlp, e.g. `socks5h://100.x.x.x:1080`. Emergency lever — only needed if the VPS IP gets hard-blocked by YouTube. |

### 3. Start everything

```sh
docker compose up -d --build
```

This starts three containers:
- **bot** — the Discord bot
- **pot-provider** — mints YouTube PO tokens so yt-dlp isn't detected as a bot
- **cookie-refresher** — headless Chromium that keeps a valid `cookies.txt` for restricted content

---

## Cookie-refresher: one-time sign-in

The cookie-refresher needs to be signed into a **dedicated burner Google account** (never used on your laptop or phone — a shared account will get its session rotated out from under the bot).

On first start the container waits up to 15 minutes for you to sign in via its built-in browser:

1. Make sure `METRICS_BIND_IP` is set to your VPS Tailscale IP in `.env`
2. Open `http://<VPS-Tailscale-IP>:6080/vnc.html` in your browser
3. Sign into YouTube with the burner account in the browser window that appears
4. The container detects the login and exports `cookies.txt` automatically

After the initial sign-in, cookies are refreshed **daily at 03:00 UTC** automatically. The Chromium profile is persisted in a Docker named volume (`cookie-profile`) so the browser stays logged in across restarts.

If you need to re-run setup manually (e.g. the session was lost):

```sh
docker compose exec cookie-refresher env WAIT_FOR_LOGIN=1 DISPLAY=:99 node /app/refresh.js
```

Then sign in via noVNC as above.

---

## Deploying updates

**On your Mac** — push changes to GitHub:

```sh
git push origin main
```

**On the VPS** — pull and rebuild:

```sh
cd /opt/stacks/audio-bot
./deploy.sh
```

`deploy.sh` runs `git pull origin main && docker compose up -d --build`.

---

## Emergency: manual cookie export

If the cookie-refresher isn't working and you need cookies immediately, run this from your Mac (requires `yt-dlp` installed locally and SSH access to the VPS):

```sh
./refresh-cookies.sh user@<VPS-Tailscale-IP>
```

This exports cookies from your local Chrome and uploads them to the VPS. It's a temporary fix — the root cause is the bot-detection bypass (PO tokens), not cookies.

---

## Troubleshooting

**Bot blocked by YouTube / tracks fail to play:**

Run this inside the bot container on the VPS to see the exact error:

```sh
docker compose exec bot yt-dlp -v \
  --extractor-args 'youtubepot-bgutilhttp:base_url=http://pot-provider:4416;youtube:player_client=web,web_safari,tv_embedded' \
  --remote-components ejs:github \
  -f bestaudio -g "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

Look for:
- `Fetching GVS PO Token` → pot-provider is working correctly
- `Sign in to confirm you're not a bot` / `PO Token not available` → pot-provider isn't reachable; check `docker compose logs pot-provider`
- `nsig extraction failed` → the JS challenge solver (Deno/ejs) isn't working; check Deno is installed in the bot container
- 403 on restricted videos only (public works fine) → cookies issue; re-run the cookie-refresher setup

**Check pot-provider is issuing tokens:**

```sh
docker compose logs pot-provider
```

**Check cookie-refresher status:**

```sh
docker compose logs cookie-refresher
docker compose exec cookie-refresher crontab -l   # should show daily 03:00 entry
```

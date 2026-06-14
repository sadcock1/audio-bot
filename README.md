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

```sh
cp .env.example .env
nano .env
```

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Discord application ID |
| `GUILD_ID` | Your Discord server ID |
| `MUSIC_CHANNEL_ID` | Voice channel ID the bot will join |
| `SPOTIFY_CLIENT_ID` | Spotify API client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify API client secret |
| `METRICS_BIND_IP` | Set to your VPS Tailscale IP to expose noVNC and metrics over Tailscale |

### 3. Start everything

```sh
docker compose up -d --build
```

This starts two containers:
- **bot** — the Discord bot
- **cookie-refresher** — headless Chromium that keeps a valid `cookies.txt` so yt-dlp can download audio

---

## Cookie-refresher: one-time sign-in

The cookie-refresher needs to be signed into a **dedicated burner Google account** — never use your personal account, as signing in on another device will invalidate the bot's session.

On first start the container waits up to 15 minutes for you to sign in:

1. Open `http://<VPS-Tailscale-IP>:6080/vnc.html` in your browser
2. Sign into YouTube with the burner account in the browser window that appears
3. The script detects the login, exports `cookies.txt`, and closes the browser (VNC goes black — that's normal)

After the initial sign-in, cookies are refreshed **daily at 03:00 UTC** automatically. The Chromium profile persists in a Docker named volume so the browser stays logged in across restarts.

If the session is ever lost and you need to re-run setup:

```sh
docker compose exec cookie-refresher env WAIT_FOR_LOGIN=1 DISPLAY=:99 node /app/refresh.js
```

Then open noVNC and sign in again.

---

## Deploying updates

**On your Mac:**

```sh
git push origin main
```

**On the VPS:**

```sh
cd /opt/stacks/audio-bot
./deploy.sh
```

`deploy.sh` runs `git pull origin main && docker compose up -d --build`.

---

## Emergency: manual cookie export

If the cookie-refresher isn't working and you need cookies immediately, run from your Mac (requires `yt-dlp` installed locally and SSH access to the VPS):

```sh
./refresh-cookies.sh user@<VPS-Tailscale-IP>
```

This exports cookies from your local Chrome and uploads them to the VPS.

---

## Troubleshooting

**Tracks fail to play / "Sign in to confirm you're not a bot":**

Check the cookie-refresher is healthy and has exported cookies:

```sh
docker compose logs cookie-refresher --tail=20
ls -lh /opt/stacks/audio-bot/cookies/
```

If `cookies.txt` is missing or the refresher timed out waiting for sign-in, re-run the setup command above.

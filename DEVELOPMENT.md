# Development Notes

Everything about how this project works, decisions made, and why. For future reference.

---

## What it does

Discord music bot. Users run `/play <song or URL>` in a Discord server and the bot joins the voice channel and plays audio. Supports YouTube URLs, YouTube search queries, and Spotify links (Spotify links are resolved to a YouTube search).

Queue system is in-memory — restarting the bot clears the queue.

---

## Stack

- **discord.js v14** — Discord API client and voice
- **@discordjs/voice** — voice connection and audio playback
- **yt-dlp** — downloads/extracts YouTube stream URLs
- **ffmpeg** — transcodes audio to Opus for Discord
- **youtube-sr** — search YouTube by text query (avoids hitting yt-dlp for searches)
- **Docker Compose** — runs everything on a VPS

---

## Services (compose.yaml)

### bot
The Discord bot itself. Builds from the root `Dockerfile`.

- Reads cookies from `/cookies/cookies.txt` (mounted from `./cookies` on the host)
- Uses `yt-dlp` to get a direct stream URL, then pipes through `ffmpeg` to Discord

### cookie-refresher
Headless Chromium (via Playwright) that stays signed into YouTube and exports fresh cookies daily.

- Builds from `./cookie-refresher/`
- Shares the `./cookies` volume with the bot
- Keeps a persistent Chromium profile in the `cookie-profile` named Docker volume
- Exposes noVNC on port 6080 (bound to Tailscale IP) for browser access

---

## The YouTube bot-detection problem

**The core issue:** YouTube detects and blocks yt-dlp specifically — not the VPS IP. A real browser on the VPS IP (e.g. via VPN from a laptop) plays YouTube fine. The problem is that yt-dlp requests don't look like a browser.

There are two things YouTube checks:
1. **Valid cookies** — a signed-in Google session raises trust
2. **JS challenge solving** — YouTube encodes stream URLs with an `n` parameter (nsig) and a signature that require running JavaScript to decrypt. Without this, the stream URL is invalid.

### What we tried and removed

**bgutil / pot-provider:** A separate container (`brainicism/bgutil-ytdlp-pot-provider`) that mints YouTube "PO tokens" (browser attestation tokens) via BotGuard. This was the original approach before the cookie-refresher was built. It was removed because:
- The Playwright cookie approach (a real signed-in browser) is more reliable and simpler
- Maintaining two separate anti-detection systems adds complexity
- The pot-provider worked for some videos but not all

**GitHub Actions self-hosted runner:** A deploy workflow (`.github/workflows/deploy.yml`) that would auto-deploy on push. Removed because the self-hosted runner wasn't set up on the VPS and it's simpler to just pull manually.

---

## How yt-dlp works here

See `handlers/resolver.js`.

yt-dlp is called in two modes:
1. **Metadata** (`--dump-json`) — gets title, duration, thumbnail for a URL
2. **Stream URL** (`-g`) — gets the direct audio stream URL without downloading

The stream URL is then passed to ffmpeg which fetches and transcodes it live.

**Args always passed:**
- `--remote-components ejs:github` — downloads the JS challenge solver script from GitHub releases. Required for Deno to solve the nsig and signature challenges. Without this, ffmpeg gets an unresolved URL and audio either fails or plays silence.
- `--cookies /cookies/cookies.txt` — passed only when the file exists (conditional)
- `--proxy` — passed only when `YT_PROXY` env var is set (emergency lever)

**Deno** is installed in the bot container. yt-dlp uses it as the JS runtime for challenge solving. Without Deno, yt-dlp warns "No supported JavaScript runtime" and signature/nsig solving fails, causing "Requested format is not available" errors.

---

## ffmpeg audio pipeline

```
YouTube stream URL → ffmpeg → OGG/Opus pipe → @discordjs/voice
```

ffmpeg args (from `handlers/resolver.js`):
```
-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5
-i <stream_url>
-f ogg -c:a libopus -b:a 128k -ar 48000 -ac 2
pipe:1
```

**Important:** `-b:a 128k` must be set explicitly. Without it, libopus defaults to ~96kbps and audio sounds muffled when re-encoding YouTube's already-compressed streams. 128kbps is Discord's recommended ceiling for voice.

The `-reconnect` flags let ffmpeg retry if the stream connection drops mid-track. YouTube stream URLs expire after a few hours so long tracks can hit this.

---

## Cookie-refresher: how and why

### Why Playwright and not manual export
The original workflow was manually exporting `cookies.txt` from the laptop and SCP-ing it to the VPS. This breaks quickly because:
- **Shared-account session rotation:** If the same Google account is logged in on a laptop and the VPS, Google rotates the session token when the laptop browser refreshes it, invalidating the VPS copy
- **Datacenter IP flagging:** Cookies minted on a residential IP (laptop) and replayed from a datacenter IP (VPS) look like session hijacking

The Playwright cookie-refresher runs on the VPS itself, signs in once via noVNC, and keeps the session alive from the same IP it will be used on.

### Why a burner Google account
**Critical:** the cookie-refresher must use a dedicated Google account that is never signed into on any other device (laptop, phone, etc). If any other device signs in with the same account, Google rotates the session token and invalidates the bot's cookies.

Create a throwaway Gmail account used exclusively for this bot.

### Why Chromium stays open permanently
Earlier versions of refresh.js would open Chromium, export cookies, and close the browser. This caused Google to invalidate the session on each rebuild because the open/close cycle looked suspicious (a browser that instantly opens, grabs cookies, and closes without any browsing behaviour).

The current approach: Chromium launches on container start and **never closes**. Cookies are exported on startup and then every 24 hours via `setInterval`. Google sees a persistent browser session, which it trusts.

The Chromium profile is stored in the `cookie-profile` named Docker volume — this persists across container restarts and rebuilds, keeping the session alive.

### First-time setup
On first start (or if the session is lost), the container waits up to 15 minutes for a sign-in via noVNC:

1. Open `http://<VPS-Tailscale-IP>:6080/vnc.html`
2. Sign into YouTube with the burner account
3. The script detects the SID cookie, exports cookies, and keeps running

If you need to re-trigger sign-in manually:
```sh
docker compose exec cookie-refresher env WAIT_FOR_LOGIN=1 DISPLAY=:99 node /app/refresh.js
```

Note: this will start a second Chromium process alongside the running one. Stop the container first if the existing session is broken, then start it fresh.

### Cookie validation
Before writing `cookies.txt`, the script checks that at least one of `SID`, `__Secure-1PSID`, or `SAPISID` is present. It writes to a temp file first then atomically renames it, so a failed export never corrupts the live file.

---

## Deploy workflow

No CI/CD. Manual deploy preferred — simpler, no runner to maintain.

**From the Mac (push changes):**
```sh
git push origin main
```

**On the VPS (pull and rebuild):**
```sh
cd /opt/stacks/audio-bot
./deploy.sh
```

`deploy.sh` = `git pull origin main && docker compose up -d --build`

The `cookie-profile` named volume and the `./cookies` bind mount survive rebuilds. After a rebuild the cookie-refresher will either:
- Detect the existing session in the profile and silently re-export cookies, or
- Ask for noVNC sign-in if the session was lost

---

## Emergency: residential proxy

If the VPS IP ever gets hard-blocked by YouTube (currently it isn't — a browser on the VPS works fine), there's a pre-built proxy escape hatch.

On the Mac, run:
```sh
microsocks -i <mac-tailscale-ip> -p 1080
```

On the VPS, add to `.env`:
```
YT_PROXY=socks5h://<mac-tailscale-ip>:1080
```

Then `./deploy.sh`. yt-dlp will route all requests through the Mac's residential IP. Requires the Mac to be online and on Tailscale — not suitable as a permanent solution.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | Yes | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Yes | Discord application ID |
| `GUILD_ID` | Yes | Discord server ID |
| `MUSIC_CHANNEL_ID` | Yes | Voice channel the bot joins |
| `SPOTIFY_CLIENT_ID` | Yes | Spotify API credentials |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify API credentials |
| `METRICS_BIND_IP` | Recommended | Set to VPS Tailscale IP — exposes metrics (port 9090) and noVNC (port 6080) over Tailscale only |
| `METRICS_PORT` | No | Prometheus metrics port, default 9090 |
| `YT_PROXY` | No | SOCKS5 proxy for yt-dlp. Emergency only. |

`.env` is gitignored. `cookies.txt` and the `cookies/` directory are gitignored.

---

## Preferences

- **Keep it simple.** No bgutil, no pot-provider, no CI runner. One cookie-refresher, one bot, plain yt-dlp with cookies.
- **Self-contained on the VPS.** Nothing should require the Mac to be online for normal operation. The proxy is an emergency fallback only.
- **Manual deploy is fine.** `git push` then `./deploy.sh` is two commands and takes seconds. No need for a self-hosted Actions runner.
- **Burner account only.** Never use a personal Google account for the bot session.
- **No persistent queue.** In-memory is intentional — keeps the code simple, a restart is a clean slate.

---

## Known issues / things to watch

- **Session loss on rebuild:** If the burner account session expires between rebuilds (e.g. after a long period of inactivity), the cookie-refresher will wait 15 minutes for noVNC sign-in. Watch `docker compose logs cookie-refresher` after a deploy if the bot stops working.
- **Stream URL expiry:** YouTube stream URLs (the direct `-g` output) expire after a few hours. Very long tracks or tracks left paused may fail to resume. The ffmpeg `-reconnect` flags help but can't recover an expired URL.
- **yt-dlp updates:** YouTube frequently changes its extraction logic. If the bot suddenly stops working after working fine, update yt-dlp: `docker compose build --no-cache bot` forces a fresh pip install.
- **challenge solver script:** `--remote-components ejs:github` downloads the solver on first use and caches it inside the container. After a rebuild the cache is cleared and it re-downloads on the first play. This is normal.

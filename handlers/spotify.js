const PLAYLIST_RE = /spotify\.com\/playlist\/([a-zA-Z0-9]+)/i;

function extractPlaylistId(url) {
  return url.match(PLAYLIST_RE)?.[1] ?? null;
}

async function getToken() {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env');
  }
  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify auth failed (${res.status}) — check your credentials`);
  const { access_token } = await res.json();
  return access_token;
}

// Returns array of search query strings: "Track Name Artist1, Artist2"
async function getPlaylistTracks(playlistId) {
  const token = await getToken();
  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(name,artists(name)))`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Spotify API error (${res.status})`);
    const data = await res.json();
    for (const { track } of data.items) {
      if (track?.name) {
        const artists = track.artists.map(a => a.name).join(', ');
        tracks.push(`${track.name} ${artists}`);
      }
    }
    url = data.next;
  }

  return tracks;
}

module.exports = { extractPlaylistId, getPlaylistTracks };

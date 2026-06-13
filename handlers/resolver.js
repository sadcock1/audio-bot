const { spawn } = require('child_process');
const { StreamType } = require('@discordjs/voice');
const YouTube = require('youtube-sr').default;

const URL_RE = /^https?:\/\//i;

async function resolve(query) {
  if (URL_RE.test(query)) {
    const info = await ytdlpInfo(query);
    return {
      url: query,
      title: info.title,
      duration: Math.round(info.duration ?? 0),
      thumbnail: info.thumbnail ?? null,
    };
  }

  const result = await YouTube.searchOne(query);
  if (!result) throw new Error('No results found');
  return {
    url: result.url,
    title: result.title,
    duration: result.duration ? Math.floor(result.duration / 1000) : 0,
    thumbnail: result.thumbnail?.url ?? null,
  };
}

function ytdlpInfo(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);
    let buf = '';
    proc.stdout.on('data', chunk => { buf += chunk; });
    proc.stderr.on('data', () => {});
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('yt-dlp metadata failed'));
      try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
    });
  });
}

// Extracts a direct streamable URL from yt-dlp (no pipe needed, enables fast seeking)
function getStreamUrl(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', ['--no-playlist', '-f', 'bestaudio/best', '-g', url]);
    let buf = '';
    let err = '';
    proc.stdout.on('data', chunk => { buf += chunk; });
    proc.stderr.on('data', chunk => { err += chunk; });
    proc.on('close', code => {
      if (code !== 0) {
        console.error('[yt-dlp]', err.trim());
        return reject(new Error('yt-dlp URL extraction failed'));
      }
      resolve(buf.trim());
    });
  });
}

async function createAudioStream(url, seekSeconds = 0) {
  const streamUrl = await getStreamUrl(url);

  const args = [
    '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
  ];
  if (seekSeconds > 0) args.push('-ss', String(Math.floor(seekSeconds)));
  args.push('-i', streamUrl, '-f', 'ogg', '-c:a', 'libopus', '-ar', '48000', '-ac', '2', 'pipe:1');

  const ffmpeg = spawn('ffmpeg', args);
  ffmpeg.stderr.on('data', () => {});
  ffmpeg.on('error', () => {});

  return { stream: ffmpeg.stdout, type: StreamType.OggOpus };
}

module.exports = { resolve, createAudioStream };

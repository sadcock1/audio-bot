const { createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { createAudioStream } = require('./resolver');
const { getQueue, deleteQueue } = require('./queueManager');
const { getSettings } = require('./guildSettings');
const { tracksPlayed } = require('./metrics');

async function playTrack(guildId, track, seekSeconds = 0) {
  const queue = getQueue(guildId);
  if (!queue) return;

  try {
    const { stream, type } = await createAudioStream(track.url, seekSeconds);

    // Re-check after async URL extraction — queue may have been stopped
    const currentQueue = getQueue(guildId);
    if (!currentQueue) return;

    const resource = createAudioResource(stream, { inputType: type, inlineVolume: true });
    const { volume } = getSettings(guildId);
    resource.volume.setVolume(volume);

    currentQueue.player.play(resource);
    currentQueue.currentResource = resource;
    currentQueue.paused = false;
    currentQueue.trackStartedAt = Date.now();
    currentQueue.seekOffset = seekSeconds;

    tracksPlayed.inc({ guild_id: guildId });
    require('./controlMessage').updateControlMessage(guildId);
  } catch (err) {
    console.error(`Failed to play "${track.title}":`, err.message);
    const currentQueue = getQueue(guildId);
    if (!currentQueue) return;
    currentQueue.currentIndex++;
    if (currentQueue.currentIndex < currentQueue.tracks.length) {
      playTrack(guildId, currentQueue.tracks[currentQueue.currentIndex]);
    } else {
      cleanup(guildId);
    }
  }
}

function getElapsedSeconds(queue) {
  if (!queue.trackStartedAt) return 0;
  return queue.seekOffset + Math.floor((Date.now() - queue.trackStartedAt) / 1000);
}

function setupPlayerEvents(guildId, player) {
  player.on(AudioPlayerStatus.Idle, () => {
    const queue = getQueue(guildId);
    if (!queue) return;

    queue.currentIndex++;

    if (queue.currentIndex < queue.tracks.length) {
      playTrack(guildId, queue.tracks[queue.currentIndex]);
    } else {
      cleanup(guildId);
    }
  });

  player.on('error', err => {
    console.error('AudioPlayer error:', err.message);
    const queue = getQueue(guildId);
    if (!queue) return;
    queue.currentIndex++;
    if (queue.currentIndex < queue.tracks.length) {
      playTrack(guildId, queue.tracks[queue.currentIndex]);
    } else {
      cleanup(guildId);
    }
  });
}

function cleanup(guildId) {
  const queue = getQueue(guildId);
  if (!queue) return;

  if (queue.controlMessage) {
    queue.controlMessage
      .edit({ content: 'Queue finished.', embeds: [], components: [] })
      .catch(() => {});
  }

  try { queue.connection.destroy(); } catch (_) {}

  deleteQueue(guildId);
}

module.exports = { playTrack, setupPlayerEvents, cleanup, getElapsedSeconds };

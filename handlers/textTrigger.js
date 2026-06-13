const { getQueue } = require('./queueManager');
const { updateControlMessage } = require('./controlMessage');
const { hasDjPermission } = require('./guildSettings');

const PAUSE_RE = /\bpause\b/i;
const RESUME_RE = /\bresume\b/i;

async function handleTextTrigger(message) {
  if (message.channelId !== process.env.MUSIC_CHANNEL_ID) return;
  if (!hasDjPermission({ guildId: message.guildId, member: message.member })) return;

  const queue = getQueue(message.guildId);
  if (!queue) return;

  if (!queue.paused && PAUSE_RE.test(message.content)) {
    queue.player.pause();
    queue.paused = true;
    await updateControlMessage(message.guildId);
    await message.react('⏸️');
  } else if (queue.paused && RESUME_RE.test(message.content)) {
    queue.player.unpause();
    queue.paused = false;
    await updateControlMessage(message.guildId);
    await message.react('▶️');
  }
}

module.exports = { handleTextTrigger };

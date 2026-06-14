const { getQueue } = require('../handlers/queueManager');
const { playTrack, getElapsedSeconds } = require('../handlers/audioPlayer');
const { formatDuration } = require('../handlers/controlMessage');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  name: 'forward',

  async execute(message, args) {
    if (!hasDjPermission(message)) {
      return message.reply('You need the DJ role to seek.');
    }
    const queue = getQueue(message.guildId);
    const track = queue?.tracks[queue.currentIndex];
    if (!track) return message.reply('Nothing is playing.');

    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 1) {
      return message.reply('Please provide a valid number of seconds.');
    }

    const targetPos = getElapsedSeconds(queue) + seconds;

    if (track.duration && targetPos >= track.duration) {
      queue.player.stop(true);
      return message.reply('Skipped to end of track.');
    }

    await playTrack(message.guildId, track, targetPos);
    await message.reply(`Jumped to **${formatDuration(targetPos)}**.`);
  },
};

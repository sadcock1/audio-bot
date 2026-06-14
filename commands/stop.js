const { getQueue } = require('../handlers/queueManager');
const { cleanup } = require('../handlers/audioPlayer');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  name: 'stop',

  async execute(message) {
    if (!hasDjPermission(message)) {
      return message.reply('You need the DJ role to stop playback.');
    }
    const queue = getQueue(message.guildId);
    if (!queue) return message.reply('Nothing is playing.');

    queue.tracks = [];
    queue.player.stop(true);
    cleanup(message.guildId);

    await message.reply('Stopped and disconnected.');
  },
};

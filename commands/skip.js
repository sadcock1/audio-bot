const { getQueue } = require('../handlers/queueManager');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  name: 'skip',

  async execute(message) {
    if (!hasDjPermission(message)) {
      return message.reply('You need the DJ role to skip tracks.');
    }
    const queue = getQueue(message.guildId);
    if (!queue) return message.reply('Nothing is playing.');

    queue.player.stop(true);
    await message.reply('Skipped.');
  },
};

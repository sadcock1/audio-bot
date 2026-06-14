const { getQueue } = require('../handlers/queueManager');
const { updateControlMessage } = require('../handlers/controlMessage');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  name: 'resume',

  async execute(message) {
    if (!hasDjPermission(message)) {
      return message.reply('You need the DJ role to resume playback.');
    }
    const queue = getQueue(message.guildId);
    if (!queue || !queue.paused) {
      return message.reply('Nothing to resume.');
    }

    queue.player.unpause();
    queue.paused = false;
    await updateControlMessage(message.guildId);
    await message.reply('Resumed.');
  },
};

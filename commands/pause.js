const { getQueue } = require('../handlers/queueManager');
const { updateControlMessage } = require('../handlers/controlMessage');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  name: 'pause',

  async execute(message) {
    if (!hasDjPermission(message)) {
      return message.reply('You need the DJ role to pause playback.');
    }
    const queue = getQueue(message.guildId);
    if (!queue || queue.paused) {
      return message.reply('Nothing to pause.');
    }

    queue.player.pause();
    queue.paused = true;
    await updateControlMessage(message.guildId);
    await message.reply('Paused.');
  },
};

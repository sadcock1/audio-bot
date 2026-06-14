const { getQueue } = require('../handlers/queueManager');
const { getSettings, hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  name: 'volume',

  async execute(message, args) {
    if (!hasDjPermission(message)) {
      return message.reply('You need the DJ role to change volume.');
    }

    const level = parseInt(args[0], 10);
    if (isNaN(level) || level < 0 || level > 100) {
      return message.reply('Please provide a volume level between 0 and 100.');
    }

    const normalized = level / 100;
    const settings = getSettings(message.guildId);
    settings.volume = normalized;

    const queue = getQueue(message.guildId);
    if (queue?.currentResource?.volume) {
      queue.currentResource.volume.setVolume(normalized);
    }

    await message.reply(`Volume set to **${level}%**.`);
  },
};

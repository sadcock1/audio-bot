const { getQueue } = require('../handlers/queueManager');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  name: 'shuffle',

  async execute(message) {
    if (!hasDjPermission(message)) {
      return message.reply('You need the DJ role to shuffle the queue.');
    }
    const queue = getQueue(message.guildId);
    if (!queue || queue.tracks.length === 0) return message.reply('The queue is empty.');

    const upcoming = queue.tracks.splice(queue.currentIndex + 1);
    if (upcoming.length === 0) return message.reply('Nothing left in the queue to shuffle.');

    for (let i = upcoming.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
    }
    queue.tracks.push(...upcoming);

    await message.reply(`Shuffled **${upcoming.length}** upcoming tracks.`);
  },
};

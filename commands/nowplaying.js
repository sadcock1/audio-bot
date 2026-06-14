const { EmbedBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { formatDuration } = require('../handlers/controlMessage');

module.exports = {
  name: 'nowplaying',

  async execute(message) {
    const queue = getQueue(message.guildId);
    const track = queue?.tracks[queue.currentIndex];
    if (!track) return message.reply('Nothing is playing.');

    const embed = new EmbedBuilder()
      .setTitle('Now Playing')
      .setDescription(`**${track.title}**`)
      .setColor(0x1db954);

    if (track.thumbnail) embed.setThumbnail(track.thumbnail);
    if (track.duration) embed.addFields({ name: 'Duration', value: formatDuration(track.duration), inline: true });
    if (queue.paused) embed.addFields({ name: 'Status', value: '⏸ Paused', inline: true });

    await message.reply({ embeds: [embed] });
  },
};

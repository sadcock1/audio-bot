const { EmbedBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { formatDuration } = require('../handlers/controlMessage');

module.exports = {
  name: 'queue',

  async execute(message) {
    const queue = getQueue(message.guildId);
    if (!queue || queue.tracks.length === 0) {
      return message.reply('The queue is empty.');
    }

    const lines = queue.tracks.map((track, i) => {
      const prefix = i === queue.currentIndex ? '▶ ' : `${i + 1}. `;
      const dur = track.duration ? ` [${formatDuration(track.duration)}]` : '';
      return `${prefix}**${track.title}**${dur}`;
    });

    const embed = new EmbedBuilder()
      .setTitle('Queue')
      .setDescription(lines.slice(0, 20).join('\n'))
      .setColor(0x1db954);

    if (lines.length > 20) embed.setFooter({ text: `+${lines.length - 20} more tracks` });

    await message.reply({ embeds: [embed] });
  },
};

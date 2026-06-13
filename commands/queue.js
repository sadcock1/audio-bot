const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { formatDuration } = require('../handlers/controlMessage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current queue'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue || queue.tracks.length === 0) {
      return interaction.reply({ content: 'The queue is empty.', flags: 64 });
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

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};

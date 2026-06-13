const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { formatDuration } = require('../handlers/controlMessage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    const track = queue?.tracks[queue.currentIndex];
    if (!track) return interaction.reply({ content: 'Nothing is playing.', flags: 64 });

    const embed = new EmbedBuilder()
      .setTitle('Now Playing')
      .setDescription(`**${track.title}**`)
      .setColor(0x1db954);

    if (track.thumbnail) embed.setThumbnail(track.thumbnail);
    if (track.duration) embed.addFields({ name: 'Duration', value: formatDuration(track.duration), inline: true });
    if (queue.paused) embed.addFields({ name: 'Status', value: '⏸ Paused', inline: true });

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};

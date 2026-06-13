const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),

  async execute(interaction) {
    if (!hasDjPermission(interaction)) {
      return interaction.reply({ content: 'You need the DJ role to skip tracks.', flags: 64 });
    }
    const queue = getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'Nothing is playing.', flags: 64 });

    queue.player.stop(true);
    await interaction.reply({ content: 'Skipped.', flags: 64 });
  },
};

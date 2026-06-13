const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { updateControlMessage } = require('../handlers/controlMessage');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume playback'),

  async execute(interaction) {
    if (!hasDjPermission(interaction)) {
      return interaction.reply({ content: 'You need the DJ role to resume playback.', flags: 64 });
    }
    const queue = getQueue(interaction.guildId);
    if (!queue || !queue.paused) {
      return interaction.reply({ content: 'Nothing to resume.', flags: 64 });
    }

    queue.player.unpause();
    queue.paused = false;
    await updateControlMessage(interaction.guildId);
    await interaction.reply({ content: 'Resumed.', flags: 64 });
  },
};

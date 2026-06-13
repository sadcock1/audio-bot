const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { updateControlMessage } = require('../handlers/controlMessage');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause playback'),

  async execute(interaction) {
    if (!hasDjPermission(interaction)) {
      return interaction.reply({ content: 'You need the DJ role to pause playback.', flags: 64 });
    }
    const queue = getQueue(interaction.guildId);
    if (!queue || queue.paused) {
      return interaction.reply({ content: 'Nothing to pause.', flags: 64 });
    }

    queue.player.pause();
    queue.paused = true;
    await updateControlMessage(interaction.guildId);
    await interaction.reply({ content: 'Paused.', flags: 64 });
  },
};

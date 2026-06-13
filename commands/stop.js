const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { cleanup } = require('../handlers/audioPlayer');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback, clear the queue, and disconnect'),

  async execute(interaction) {
    if (!hasDjPermission(interaction)) {
      return interaction.reply({ content: 'You need the DJ role to stop playback.', flags: 64 });
    }
    const queue = getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'Nothing is playing.', flags: 64 });

    // Clear tracks so the idle event sees an empty queue and doesn't re-trigger
    queue.tracks = [];
    queue.player.stop(true);
    cleanup(interaction.guildId);

    await interaction.reply({ content: 'Stopped and disconnected.', flags: 64 });
  },
};

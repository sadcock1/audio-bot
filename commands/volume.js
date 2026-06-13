const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { getSettings, hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set playback volume (0–100)')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Volume level (default 100)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100),
    ),

  async execute(interaction) {
    if (!hasDjPermission(interaction)) {
      return interaction.reply({ content: 'You need the DJ role to change volume.', flags: 64 });
    }

    const level = interaction.options.getInteger('level');
    const normalized = level / 100;

    const settings = getSettings(interaction.guildId);
    settings.volume = normalized;

    // Apply to currently playing resource immediately if active
    const queue = getQueue(interaction.guildId);
    if (queue?.currentResource?.volume) {
      queue.currentResource.volume.setVolume(normalized);
    }

    await interaction.reply({ content: `Volume set to **${level}%**.`, flags: 64 });
  },
};

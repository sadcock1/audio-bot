const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../handlers/queueManager');
const { playTrack, getElapsedSeconds } = require('../handlers/audioPlayer');
const { formatDuration } = require('../handlers/controlMessage');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forward')
    .setDescription('Skip forward in the current track')
    .addIntegerOption(opt =>
      opt.setName('seconds')
        .setDescription('Seconds to skip forward')
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction) {
    if (!hasDjPermission(interaction)) {
      return interaction.reply({ content: 'You need the DJ role to seek.', flags: 64 });
    }
    const queue = getQueue(interaction.guildId);
    const track = queue?.tracks[queue.currentIndex];
    if (!track) return interaction.reply({ content: 'Nothing is playing.', flags: 64 });

    const seconds = interaction.options.getInteger('seconds');
    const targetPos = getElapsedSeconds(queue) + seconds;

    if (track.duration && targetPos >= track.duration) {
      queue.player.stop(true);
      return interaction.reply({ content: 'Skipped to end of track.', flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });
    await playTrack(interaction.guildId, track, targetPos);
    await interaction.editReply(`Jumped to **${formatDuration(targetPos)}**.`);
  },
};

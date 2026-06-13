const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getQueue } = require('./queueManager');

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildEmbed(track) {
  const embed = new EmbedBuilder()
    .setTitle(track.title)
    .setColor(0x1db954);
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  if (track.duration) embed.addFields({ name: 'Duration', value: formatDuration(track.duration), inline: true });
  return embed;
}

function buildButtons(paused = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setEmoji('⏮').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('pause_resume')
      .setEmoji(paused ? '▶️' : '⏸️')
      .setLabel(paused ? 'Resume' : 'Pause')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('skip').setEmoji('⏭').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('stop').setEmoji('⏹').setStyle(ButtonStyle.Danger),
  );
}

async function sendControlMessage(channel, guildId) {
  const queue = getQueue(guildId);
  if (!queue) return;
  const track = queue.tracks[queue.currentIndex];
  if (!track) return;

  const msg = await channel.send({
    embeds: [buildEmbed(track)],
    components: [buildButtons(false)],
  });
  queue.controlMessage = msg;
}

async function updateControlMessage(guildId) {
  const queue = getQueue(guildId);
  if (!queue?.controlMessage) return;
  const track = queue.tracks[queue.currentIndex];
  if (!track) return;

  try {
    await queue.controlMessage.edit({
      embeds: [buildEmbed(track)],
      components: [buildButtons(queue.paused)],
    });
  } catch (err) {
    // Unknown Message — it was deleted, resend
    if (err.code === 10008) {
      const channel = queue.controlMessage.channel;
      queue.controlMessage = null;
      await sendControlMessage(channel, guildId);
    }
  }
}

async function handleButton(interaction) {
  const { cleanup } = require('./audioPlayer');
  const { hasDjPermission } = require('./guildSettings');

  if (!hasDjPermission(interaction)) {
    return interaction.reply({ content: 'You need the DJ role to use music controls.', flags: 64 });
  }

  const queue = getQueue(interaction.guildId);
  if (!queue) {
    return interaction.reply({ content: 'Nothing is playing.', flags: 64 });
  }

  await interaction.deferUpdate();

  switch (interaction.customId) {
    case 'pause_resume':
      if (queue.paused) {
        queue.player.unpause();
        queue.paused = false;
      } else {
        queue.player.pause();
        queue.paused = true;
      }
      await updateControlMessage(interaction.guildId);
      break;

    case 'skip':
      queue.player.stop(true);
      break;

    case 'stop':
      queue.tracks = [];
      queue.player.stop(true);
      cleanup(interaction.guildId);
      break;

    case 'prev':
      // Set index so that after idle fires and does currentIndex++, we land on currentIndex - 1.
      // Minimum of -1 so replaying track 0 is handled correctly.
      queue.currentIndex = Math.max(-1, queue.currentIndex - 2);
      queue.player.stop(true);
      break;
  }
}

module.exports = { sendControlMessage, updateControlMessage, handleButton, formatDuration };

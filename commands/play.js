const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer } = require('@discordjs/voice');
const { resolve } = require('../handlers/resolver');
const { getQueue, createQueue } = require('../handlers/queueManager');
const { playTrack, setupPlayerEvents } = require('../handlers/audioPlayer');
const { sendControlMessage } = require('../handlers/controlMessage');
const { extractPlaylistId, getPlaylistTracks } = require('../handlers/spotify');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or Spotify playlist, or add it to the queue')
    .addStringOption(opt =>
      opt.setName('query').setDescription('URL, search term, or Spotify playlist URL').setRequired(true),
    ),

  async execute(interaction) {
    if (!hasDjPermission(interaction)) {
      return interaction.reply({ content: 'You need the DJ role to play music.', flags: 64 });
    }
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: 'You must be in a voice channel.', flags: 64 });
    }

    const query = interaction.options.getString('query');
    const spotifyId = extractPlaylistId(query);

    if (spotifyId) {
      await handleSpotifyPlaylist(interaction, voiceChannel, spotifyId);
    } else {
      await handleSingleTrack(interaction, voiceChannel, query);
    }
  },
};

async function handleSingleTrack(interaction, voiceChannel, query) {
  await interaction.deferReply({ flags: 64 });

  let track;
  try {
    track = await resolve(query);
  } catch {
    return interaction.editReply('Could not resolve that track.');
  }

  const existingQueue = getQueue(interaction.guildId);
  if (existingQueue) {
    existingQueue.tracks.push(track);
    return interaction.editReply(`Added to queue: **${track.title}**`);
  }

  const { queue } = setupVoice(interaction, voiceChannel);
  queue.tracks.push(track);

  const musicChannel =
    interaction.guild.channels.cache.get(process.env.MUSIC_CHANNEL_ID) ?? interaction.channel;
  await sendControlMessage(musicChannel, interaction.guildId);
  await playTrack(interaction.guildId, track);

  await interaction.editReply(`Now playing: **${track.title}**`);
}

async function handleSpotifyPlaylist(interaction, voiceChannel, playlistId) {
  await interaction.deferReply({ flags: 64 });

  let searchQueries;
  try {
    searchQueries = await getPlaylistTracks(playlistId);
  } catch (err) {
    return interaction.editReply(`Could not fetch Spotify playlist: ${err.message}`);
  }

  if (searchQueries.length === 0) return interaction.editReply('That playlist is empty.');

  await interaction.editReply(`Loading **${searchQueries.length}** tracks from Spotify…`);

  // Set up voice connection if not already active
  let queue = getQueue(interaction.guildId);
  if (!queue) {
    ({ queue } = setupVoice(interaction, voiceChannel));
  }

  const musicChannel =
    interaction.guild.channels.cache.get(process.env.MUSIC_CHANNEL_ID) ?? interaction.channel;

  // Resolve tracks in batches of 5, starting playback as soon as the first resolves
  let started = false;
  const BATCH = 5;

  for (let i = 0; i < searchQueries.length; i += BATCH) {
    const currentQueue = getQueue(interaction.guildId);
    if (!currentQueue) break; // Stopped mid-load

    const results = await Promise.allSettled(
      searchQueries.slice(i, i + BATCH).map(q => resolve(q)),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const currentQueue = getQueue(interaction.guildId);
      if (!currentQueue) break;

      currentQueue.tracks.push(result.value);

      if (!started) {
        started = true;
        await sendControlMessage(musicChannel, interaction.guildId);
        await playTrack(interaction.guildId, result.value);
      }
    }
  }

  if (!started) return interaction.editReply('Could not resolve any tracks from that playlist.');
}

function setupVoice(interaction, voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });
  const player = createAudioPlayer();
  connection.subscribe(player);
  const queue = createQueue(interaction.guildId, { player, connection });
  setupPlayerEvents(interaction.guildId, player);
  return { connection, player, queue };
}

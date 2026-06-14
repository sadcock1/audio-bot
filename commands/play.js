const { joinVoiceChannel, createAudioPlayer } = require('@discordjs/voice');
const { resolve } = require('../handlers/resolver');
const { getQueue, createQueue } = require('../handlers/queueManager');
const { playTrack, setupPlayerEvents } = require('../handlers/audioPlayer');
const { sendControlMessage } = require('../handlers/controlMessage');
const { extractPlaylistId, getPlaylistTracks } = require('../handlers/spotify');
const { hasDjPermission } = require('../handlers/guildSettings');

module.exports = {
  name: 'play',

  async execute(message, args) {
    if (!hasDjPermission(message)) {
      return message.reply('You need the DJ role to play music.');
    }
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('You must be in a voice channel.');
    }

    const query = args.join(' ');
    if (!query) return message.reply('Please provide a URL or search query.');

    const spotifyId = extractPlaylistId(query);
    if (spotifyId) {
      await handleSpotifyPlaylist(message, voiceChannel, spotifyId);
    } else {
      await handleSingleTrack(message, voiceChannel, query);
    }
  },
};

async function handleSingleTrack(message, voiceChannel, query) {
  let track;
  try {
    track = await resolve(query);
  } catch {
    return message.reply('Could not resolve that track.');
  }

  const existingQueue = getQueue(message.guildId);
  if (existingQueue) {
    existingQueue.tracks.push(track);
    return message.reply(`Added to queue: **${track.title}**`);
  }

  const { queue } = setupVoice(message, voiceChannel);
  queue.tracks.push(track);

  const musicChannel =
    message.guild.channels.cache.get(process.env.MUSIC_CHANNEL_ID) ?? message.channel;
  await sendControlMessage(musicChannel, message.guildId);
  await playTrack(message.guildId, track);

  await message.reply(`Now playing: **${track.title}**`);
}

async function handleSpotifyPlaylist(message, voiceChannel, playlistId) {
  let searchQueries;
  try {
    searchQueries = await getPlaylistTracks(playlistId);
  } catch (err) {
    return message.reply(`Could not fetch Spotify playlist: ${err.message}`);
  }

  if (searchQueries.length === 0) return message.reply('That playlist is empty.');

  await message.reply(`Loading **${searchQueries.length}** tracks from Spotify…`);

  let queue = getQueue(message.guildId);
  if (!queue) {
    ({ queue } = setupVoice(message, voiceChannel));
  }

  const musicChannel =
    message.guild.channels.cache.get(process.env.MUSIC_CHANNEL_ID) ?? message.channel;

  let started = false;
  const BATCH = 5;

  for (let i = 0; i < searchQueries.length; i += BATCH) {
    const currentQueue = getQueue(message.guildId);
    if (!currentQueue) break;

    const results = await Promise.allSettled(
      searchQueries.slice(i, i + BATCH).map(q => resolve(q)),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const currentQueue = getQueue(message.guildId);
      if (!currentQueue) break;

      currentQueue.tracks.push(result.value);

      if (!started) {
        started = true;
        await sendControlMessage(musicChannel, message.guildId);
        await playTrack(message.guildId, result.value);
      }
    }
  }

  if (!started) return message.reply('Could not resolve any tracks from that playlist.');
}

function setupVoice(message, voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guildId,
    adapterCreator: message.guild.voiceAdapterCreator,
  });
  const player = createAudioPlayer();
  connection.subscribe(player);
  const queue = createQueue(message.guildId, { player, connection });
  setupPlayerEvents(message.guildId, player);
  return { connection, player, queue };
}

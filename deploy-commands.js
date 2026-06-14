// Run this once to clear all previously registered slash commands from Discord.
// The bot now uses prefix-based text commands instead.
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Clearing all slash commands…');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log('Done. All slash commands removed.');
  } catch (err) {
    console.error(err);
  }
})();

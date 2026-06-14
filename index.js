require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { startMetricsServer } = require('./handlers/metrics');
const { handleButton } = require('./handlers/controlMessage');
const { handlePrefixCommand } = require('./handlers/prefixHandler');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(__dirname, 'commands', file));
  if (command.name && command.execute) client.commands.set(command.name, command);
}

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  startMetricsServer(Number(process.env.METRICS_PORT) || 9090);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    await handleButton(interaction);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  await handlePrefixCommand(message, client);
});

client.login(process.env.DISCORD_TOKEN);

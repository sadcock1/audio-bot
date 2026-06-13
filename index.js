require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { startMetricsServer } = require('./handlers/metrics');
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
  if (command.data && command.execute) client.commands.set(command.data.name, command);
}

const { handleTextTrigger } = require('./handlers/textTrigger');
const { handleButton } = require('./handlers/controlMessage');

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  startMetricsServer(Number(process.env.METRICS_PORT) || 9090);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const payload = { content: 'An error occurred.', flags: 64 };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
      else await interaction.reply(payload);
    }
  } else if (interaction.isButton()) {
    await handleButton(interaction);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  await handleTextTrigger(message);
});

client.login(process.env.DISCORD_TOKEN);

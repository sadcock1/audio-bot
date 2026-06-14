const { getSettings } = require('./guildSettings');

async function handlePrefixCommand(message, client) {
  if (!message.guildId) return;

  const settings = getSettings(message.guildId);
  const prefix = settings.prefix;

  if (!message.content.startsWith(prefix)) return;

  const withoutPrefix = message.content.slice(prefix.length);
  const parts = withoutPrefix.trim().split(/\s+/);
  const commandName = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  if (!commandName) return;

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(err);
    await message.reply('An error occurred.').catch(() => {});
  }
}

module.exports = { handlePrefixCommand };

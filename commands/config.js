const { getSettings } = require('../handlers/guildSettings');

module.exports = {
  name: 'config',

  async execute(message, args) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('You need the Manage Server permission to change config.');
    }

    const sub = args[0]?.toLowerCase();
    const settings = getSettings(message.guildId);

    if (sub === 'prefix') {
      const newPrefix = args[1];
      if (!newPrefix) return message.reply('Please provide a prefix. Example: `config prefix !`');
      if (newPrefix.length > 5) return message.reply('Prefix must be 5 characters or fewer.');
      settings.prefix = newPrefix;
      return message.reply(
        `Prefix changed to \`${newPrefix}\`. Commands are now: \`${newPrefix}play\`, \`${newPrefix}pause\`, \`${newPrefix}skip\`, etc.`,
      );
    }

    const prefix = settings.prefix;
    return message.reply(
      `**Current config:**\nPrefix: \`${prefix}\`\nDJ role: ${settings.djRoleId ? `<@&${settings.djRoleId}>` : 'none (everyone can use controls)'}\n\nChange prefix: \`${prefix}config prefix <new>\``,
    );
  },
};

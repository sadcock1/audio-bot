const { getSettings } = require('../handlers/guildSettings');

module.exports = {
  name: 'dj',

  async execute(message, args) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('You need the Manage Server permission to configure the DJ role.');
    }

    const sub = args[0]?.toLowerCase();
    const settings = getSettings(message.guildId);

    if (sub === 'set') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('Please mention a role. Example: `dj set @DJ`');
      settings.djRoleId = role.id;
      return message.reply(`DJ role set to ${role}.`);
    }

    if (sub === 'clear') {
      settings.djRoleId = null;
      return message.reply('DJ role restriction removed.');
    }

    // show
    if (!settings.djRoleId) {
      return message.reply('No DJ role set — everyone can use music controls.');
    }
    const role = message.guild.roles.cache.get(settings.djRoleId);
    const label = role ? role.toString() : `Unknown role (${settings.djRoleId})`;
    return message.reply(`Current DJ role: ${label}`);
  },
};

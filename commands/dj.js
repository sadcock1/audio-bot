const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../handlers/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dj')
    .setDescription('Manage the DJ role for this server')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Restrict music controls to a specific role')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The DJ role').setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('Remove the DJ role restriction (everyone can use music controls)'),
    )
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show the current DJ role setting'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const settings = getSettings(interaction.guildId);

    if (sub === 'set') {
      const role = interaction.options.getRole('role');
      settings.djRoleId = role.id;
      return interaction.reply({ content: `DJ role set to ${role}.`, flags: 64 });
    }

    if (sub === 'clear') {
      settings.djRoleId = null;
      return interaction.reply({ content: 'DJ role restriction removed.', flags: 64 });
    }

    // show
    if (!settings.djRoleId) {
      return interaction.reply({ content: 'No DJ role set — everyone can use music controls.', flags: 64 });
    }
    const role = interaction.guild.roles.cache.get(settings.djRoleId);
    const label = role ? role.toString() : `Unknown role (${settings.djRoleId})`;
    return interaction.reply({ content: `Current DJ role: ${label}`, flags: 64 });
  },
};

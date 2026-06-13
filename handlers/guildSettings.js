const settings = new Map();

function getSettings(guildId) {
  if (!settings.has(guildId)) {
    settings.set(guildId, { volume: 1.0, djRoleId: null });
  }
  return settings.get(guildId);
}

// Returns true if the member is allowed to use music controls.
// Admins always pass. If no DJ role is set, everyone passes.
function hasDjPermission(interaction) {
  const { djRoleId } = getSettings(interaction.guildId);
  if (!djRoleId) return true;
  if (interaction.member.permissions.has('Administrator')) return true;
  return interaction.member.roles.cache.has(djRoleId);
}

module.exports = { getSettings, hasDjPermission };

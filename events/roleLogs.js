const { AuditLogEvent, EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  name: Events.GuildRoleUpdate,
  async execute(oldRole, newRole, client) {
    if (!config.channels.modLogs || oldRole.permissions.bitfield === newRole.permissions.bitfield) {
      return;
    }

    const auditLogs = await newRole.guild.fetchAuditLogs({
      type: AuditLogEvent.RoleUpdate,
      limit: 1,
    }).catch(() => null);
    const log = auditLogs?.entries.first();
    const executor = log?.executor ? `${log.executor} (${log.executor.username})` : 'Unknown';

    const addedPermissions = oldRole.permissions.missing(newRole.permissions);
    const removedPermissions = newRole.permissions.missing(oldRole.permissions);
    const changes = [];

    if (addedPermissions.length > 0) {
      changes.push(`Added: ${formatPermissions(addedPermissions)}`);
    }

    if (removedPermissions.length > 0) {
      changes.push(`Removed: ${formatPermissions(removedPermissions)}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('Role Permissions Updated')
      .setColor(0xff6b6b)
      .addFields(
        { name: 'Role', value: `${newRole} (${newRole.name})`, inline: true },
        { name: 'Modified By', value: executor, inline: false },
        { name: 'Changes', value: changes.join('\n').slice(0, 1024), inline: false },
      )
      .setTimestamp();

    await sendLog(client, config.channels.modLogs, { embeds: [embed] });
  },
};

function formatPermissions(permissions) {
  return permissions.map((permission) => permission.replace(/([A-Z])/g, ' $1').trim()).join(', ');
}

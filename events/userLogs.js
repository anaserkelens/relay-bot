const { AuditLogEvent, EmbedBuilder } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  setup(client) {
    client.on('guildMemberUpdate', (oldMember, newMember) => logGuildMemberUpdate(oldMember, newMember, client));
    client.on('userUpdate', (oldUser, newUser) => logUserUpdate(oldUser, newUser, client));
  },
};

async function logGuildMemberUpdate(oldMember, newMember, client) {
  if (!config.channels.userLogs) {
    return;
  }

  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('Member Nickname Updated')
      .setDescription(`Member: ${newMember.user} (${newMember.user.id})`)
      .addFields(
        { name: 'Old Nickname', value: oldMember.displayName || 'None', inline: true },
        { name: 'New Nickname', value: newMember.displayName || 'None', inline: true },
      )
      .setThumbnail(newMember.user.displayAvatarURL())
      .setTimestamp();

    await sendLog(client, config.channels.userLogs, { embeds: [embed] });
  }

  const addedRoles = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id));
  const removedRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));

  if (addedRoles.size === 0 && removedRoles.size === 0) {
    return;
  }

  const auditLogs = await newMember.guild.fetchAuditLogs({
    type: AuditLogEvent.MemberRoleUpdate,
    limit: 1,
  }).catch(() => null);
  const log = auditLogs?.entries.first();
  const executor =
    log && log.target?.id === newMember.id && Date.now() - log.createdTimestamp < 5000
      ? `${log.executor} (${log.executor.username})`
      : 'Unknown';

  const embed = new EmbedBuilder()
    .setColor(addedRoles.size > 0 ? 0x00ff00 : 0xff0000)
    .setTitle('Member Roles Updated')
    .setDescription(`Member: ${newMember.user} (${newMember.user.id})`)
    .addFields({ name: 'Changed By', value: executor, inline: false })
    .setThumbnail(newMember.user.displayAvatarURL())
    .setTimestamp();

  if (addedRoles.size > 0) {
    embed.addFields({ name: 'Role(s) Added', value: addedRoles.map((role) => role.toString()).join(', '), inline: false });
  }

  if (removedRoles.size > 0) {
    embed.addFields({ name: 'Role(s) Removed', value: removedRoles.map((role) => role.toString()).join(', '), inline: false });
  }

  await sendLog(client, config.channels.userLogs, { embeds: [embed] });
}

async function logUserUpdate(oldUser, newUser, client) {
  if (!config.channels.userLogs || oldUser.username === newUser.username) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle('Username Updated')
    .setDescription(`User: ${newUser} (${newUser.id})`)
    .addFields(
      { name: 'Old Username', value: oldUser.username, inline: true },
      { name: 'New Username', value: newUser.username, inline: true },
    )
    .setThumbnail(newUser.displayAvatarURL())
    .setTimestamp();

  await sendLog(client, config.channels.userLogs, { embeds: [embed] });
}

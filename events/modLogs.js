const { AuditLogEvent, EmbedBuilder } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  setup(client) {
    client.on('guildBanAdd', (ban) => logBanAdd(ban, client));
    client.on('guildBanRemove', (ban) => logBanRemove(ban, client));
    client.on('guildMemberUpdate', (oldMember, newMember) => logTimeoutUpdate(oldMember, newMember, client));
  },
};

async function logBanAdd(ban, client) {
  if (!config.channels.modLogs) {
    return;
  }

  const auditLogs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
  const banLog = auditLogs?.entries.first();
  const executor = banLog?.executor || 'Unknown';
  const reason = banLog?.reason || 'No reason provided';

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Member Banned')
    .addFields(
      { name: 'User', value: `${ban.user} (${ban.user.id})`, inline: true },
      { name: 'Moderator', value: executor.tag || `${executor}`, inline: true },
      { name: 'Reason', value: reason, inline: false },
    )
    .setThumbnail(ban.user.displayAvatarURL())
    .setTimestamp();

  await sendLog(client, config.channels.modLogs, { embeds: [embed] });
}

async function logBanRemove(ban, client) {
  if (!config.channels.modLogs) {
    return;
  }

  const auditLogs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 }).catch(() => null);
  const unbanLog = auditLogs?.entries.first();
  const executor = unbanLog?.executor || 'Unknown';

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('Ban Removed')
    .addFields(
      { name: 'User', value: `${ban.user} (${ban.user.id})`, inline: true },
      { name: 'Moderator', value: executor.tag || `${executor}`, inline: true },
    )
    .setThumbnail(ban.user.displayAvatarURL())
    .setTimestamp();

  await sendLog(client, config.channels.modLogs, { embeds: [embed] });
}

async function logTimeoutUpdate(oldMember, newMember, client) {
  if (!config.channels.modLogs) {
    return;
  }

  const oldTimeout = oldMember.communicationDisabledUntil;
  const newTimeout = newMember.communicationDisabledUntil;

  if (!oldTimeout && newTimeout) {
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('Member Timed Out')
      .addFields(
        { name: 'User', value: `${newMember.user} (${newMember.user.id})`, inline: true },
        { name: 'Until', value: `<t:${Math.floor(newTimeout.getTime() / 1000)}:F>`, inline: false },
      )
      .setThumbnail(newMember.user.displayAvatarURL())
      .setTimestamp();

    await sendLog(client, config.channels.modLogs, { embeds: [embed] });
  }

  if (oldTimeout && !newTimeout) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Timeout Removed')
      .addFields({ name: 'User', value: `${newMember.user} (${newMember.user.id})`, inline: true })
      .setThumbnail(newMember.user.displayAvatarURL())
      .setTimestamp();

    await sendLog(client, config.channels.modLogs, { embeds: [embed] });
  }
}

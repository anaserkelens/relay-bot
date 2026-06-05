const { AuditLogEvent, ChannelType, EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  setup(client) {
    client.on(Events.ChannelCreate, (channel) => logChannelCreate(channel, client));
    client.on(Events.ChannelDelete, (channel) => logChannelDelete(channel, client));
    client.on(Events.ChannelUpdate, (oldChannel, newChannel) => logChannelUpdate(oldChannel, newChannel, client));
    client.on(Events.ChannelPinsUpdate, (channel) => logChannelPinsUpdate(channel, client));
  },
};

async function getExecutor(guild, type, targetId) {
  const auditLogs = await guild.fetchAuditLogs({ type, limit: 5 }).catch(() => null);
  const log = targetId ? auditLogs?.entries.find((entry) => entry.target?.id === targetId) : auditLogs?.entries.first();
  return log?.executor ? `${log.executor} (${log.executor.username})` : 'Unknown';
}

async function logChannelCreate(channel, client) {
  if (!channel.guild || !config.channels.channelLogs) {
    return;
  }

  const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
  const embed = new EmbedBuilder()
    .setTitle('Channel Created')
    .setColor(0x00ff00)
    .addFields(
      { name: 'Channel', value: `${channel}`, inline: true },
      { name: 'Type', value: getChannelTypeName(channel.type), inline: true },
      { name: 'Created By', value: executor, inline: false },
    )
    .setTimestamp();

  await sendLog(client, config.channels.channelLogs, { embeds: [embed] });
}

async function logChannelDelete(channel, client) {
  if (!channel.guild || !config.channels.channelLogs) {
    return;
  }

  const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
  const embed = new EmbedBuilder()
    .setTitle('Channel Deleted')
    .setColor(0xff0000)
    .addFields(
      { name: 'Channel Name', value: channel.name || 'Unknown', inline: true },
      { name: 'Type', value: getChannelTypeName(channel.type), inline: true },
      { name: 'Deleted By', value: executor, inline: false },
    )
    .setTimestamp();

  await sendLog(client, config.channels.channelLogs, { embeds: [embed] });
}

async function logChannelUpdate(oldChannel, newChannel, client) {
  if (!newChannel.guild || !config.channels.channelLogs) {
    return;
  }

  const changes = [];

  if (oldChannel.name !== newChannel.name) {
    changes.push(`Name: ${oldChannel.name} -> ${newChannel.name}`);
  }

  if (oldChannel.topic !== newChannel.topic) {
    changes.push(`Topic: ${oldChannel.topic || 'None'} -> ${newChannel.topic || 'None'}`);
  }

  if (oldChannel.parentId !== newChannel.parentId) {
    changes.push(`Category: ${oldChannel.parent?.name || 'None'} -> ${newChannel.parent?.name || 'None'}`);
  }

  if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser && newChannel.rateLimitPerUser !== undefined) {
    changes.push(`Slow mode: ${oldChannel.rateLimitPerUser || 0}s -> ${newChannel.rateLimitPerUser || 0}s`);
  }

  if (changes.length === 0) {
    return;
  }

  const executor = await getExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
  const embed = new EmbedBuilder()
    .setTitle('Channel Updated')
    .setColor(0xffa500)
    .addFields(
      { name: 'Channel', value: `${newChannel}`, inline: true },
      { name: 'Modified By', value: executor, inline: false },
      { name: 'Changes', value: changes.join('\n').slice(0, 1024), inline: false },
    )
    .setTimestamp();

  await sendLog(client, config.channels.channelLogs, { embeds: [embed] });
}

async function logChannelPinsUpdate(channel, client) {
  if (!channel.guild || !config.channels.channelLogs) {
    return;
  }

  const executor = await getExecutor(channel.guild, AuditLogEvent.MessagePin);
  const embed = new EmbedBuilder()
    .setTitle('Channel Pins Updated')
    .setColor(0xffa500)
    .addFields(
      { name: 'Channel', value: `${channel}`, inline: true },
      { name: 'Modified By', value: executor, inline: false },
    )
    .setTimestamp();

  await sendLog(client, config.channels.channelLogs, { embeds: [embed] });
}

function getChannelTypeName(type) {
  const types = {
    [ChannelType.GuildText]: 'Text Channel',
    [ChannelType.GuildVoice]: 'Voice Channel',
    [ChannelType.GuildCategory]: 'Category',
    [ChannelType.GuildAnnouncement]: 'Announcement Channel',
    [ChannelType.AnnouncementThread]: 'Announcement Thread',
    [ChannelType.PublicThread]: 'Public Thread',
    [ChannelType.PrivateThread]: 'Private Thread',
    [ChannelType.GuildStageVoice]: 'Stage Channel',
    [ChannelType.GuildForum]: 'Forum Channel',
    [ChannelType.GuildMedia]: 'Media Channel',
  };

  return types[type] || 'Unknown';
}

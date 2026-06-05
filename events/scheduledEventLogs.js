const { AuditLogEvent, EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  setup(client) {
    client.on(Events.GuildScheduledEventCreate, (event) => logEventCreate(event, client));
    client.on(Events.GuildScheduledEventDelete, (event) => logEventDelete(event, client));
    client.on(Events.GuildScheduledEventUpdate, (oldEvent, newEvent) => logEventUpdate(oldEvent, newEvent, client));
    client.on(Events.GuildScheduledEventUserAdd, (event, user) => logEventUser(event, user, client, true));
    client.on(Events.GuildScheduledEventUserRemove, (event, user) => logEventUser(event, user, client, false));
  },
};

async function getExecutor(guild, type) {
  const auditLogs = await guild.fetchAuditLogs({ type, limit: 1 }).catch(() => null);
  const log = auditLogs?.entries.first();
  return log?.executor ? `${log.executor} (${log.executor.username})` : 'Unknown';
}

async function logEventCreate(event, client) {
  if (!config.channels.eventLogs) {
    return;
  }

  const executor = await getExecutor(event.guild, AuditLogEvent.GuildScheduledEventCreate);
  const embed = new EmbedBuilder()
    .setTitle('Event Created')
    .setColor(0x00ff00)
    .addFields(
      { name: 'Event', value: `${event.name} (${event.id})`, inline: false },
      { name: 'Start Time', value: event.scheduledStartTimestamp ? `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>` : 'Unknown', inline: false },
      { name: 'Created By', value: executor, inline: false },
    )
    .setTimestamp();

  await sendLog(client, config.channels.eventLogs, { embeds: [embed] });
}

async function logEventDelete(event, client) {
  if (!config.channels.eventLogs) {
    return;
  }

  const executor = await getExecutor(event.guild, AuditLogEvent.GuildScheduledEventDelete);
  const embed = new EmbedBuilder()
    .setTitle('Event Deleted')
    .setColor(0xff0000)
    .addFields(
      { name: 'Event', value: `${event.name} (${event.id})`, inline: false },
      { name: 'Deleted By', value: executor, inline: false },
    )
    .setTimestamp();

  await sendLog(client, config.channels.eventLogs, { embeds: [embed] });
}

async function logEventUpdate(oldEvent, newEvent, client) {
  if (!config.channels.eventLogs) {
    return;
  }

  const changes = [];

  if (oldEvent.name !== newEvent.name) {
    changes.push(`Name: ${oldEvent.name} -> ${newEvent.name}`);
  }

  if (oldEvent.description !== newEvent.description) {
    changes.push('Description changed');
  }

  if (oldEvent.scheduledStartTimestamp !== newEvent.scheduledStartTimestamp) {
    changes.push('Start time changed');
  }

  if (oldEvent.scheduledEndTimestamp !== newEvent.scheduledEndTimestamp) {
    changes.push('End time changed');
  }

  if (changes.length === 0) {
    return;
  }

  const executor = await getExecutor(newEvent.guild, AuditLogEvent.GuildScheduledEventUpdate);
  const embed = new EmbedBuilder()
    .setTitle('Event Updated')
    .setColor(0xffa500)
    .addFields(
      { name: 'Event', value: `${newEvent.name} (${newEvent.id})`, inline: false },
      { name: 'Modified By', value: executor, inline: false },
      { name: 'Changes', value: changes.join('\n'), inline: false },
    )
    .setTimestamp();

  await sendLog(client, config.channels.eventLogs, { embeds: [embed] });
}

async function logEventUser(event, user, client, subscribed) {
  if (!config.channels.eventLogs) {
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(subscribed ? 'Event User Subscribed' : 'Event User Unsubscribed')
    .setColor(subscribed ? 0x00ff00 : 0xff0000)
    .addFields(
      { name: 'Event', value: `${event.name} (${event.id})`, inline: false },
      { name: 'User', value: `${user} (${user.username})`, inline: false },
    )
    .setTimestamp();

  await sendLog(client, config.channels.eventLogs, { embeds: [embed] });
}

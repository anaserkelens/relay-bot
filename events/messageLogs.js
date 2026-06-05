const { AuditLogEvent, EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (!message.guild || !config.channels.messageLogs || message.author?.bot) {
      return;
    }

    const auditLogs = await message.guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 1,
    }).catch(() => null);

    const deleteLog = auditLogs?.entries.first();
    const executor =
      deleteLog && message.author && deleteLog.target?.id === message.author.id && Date.now() - deleteLog.createdTimestamp < 5000
        ? deleteLog.executor
        : null;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Message Deleted')
      .addFields(
        { name: 'Author', value: message.author ? `${message.author} (${message.author.tag})` : 'Unknown', inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Message ID', value: message.id, inline: true },
      )
      .setTimestamp();

    if (executor) {
      embed.addFields({ name: 'Deleted By', value: `${executor} (${executor.tag})`, inline: false });
    }

    if (message.content) {
      embed.addFields({ name: 'Content', value: message.content.slice(0, 1024), inline: false });
    }

    await sendLog(client, config.channels.messageLogs, { embeds: [embed] });
  },
};

const { EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  name: Events.MessageBulkDelete,
  async execute(messages, channel, client) {
    if (!config.channels.messageLogs || !channel.guild) {
      return;
    }

    const messageList = [...messages.values()]
      .slice(0, 25)
      .map((message) => {
        const content = message.content || 'No text content';
        return `**${message.author?.tag || 'Unknown User'}**: ${content.slice(0, 100)}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Bulk Messages Deleted')
      .setDescription(`${messages.size} messages were bulk deleted in ${channel}.`)
      .addFields(
        { name: 'Channel', value: `${channel} (${channel.name})`, inline: true },
        { name: 'Message Count', value: `${messages.size}`, inline: true },
        { name: 'Deleted Messages', value: messageList || 'No message data available', inline: false },
      )
      .setTimestamp();

    await sendLog(client, config.channels.messageLogs, { embeds: [embed] });
  },
};

const { EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || !config.channels.messageLogs || newMessage.author?.bot) {
      return;
    }

    if (oldMessage.content === newMessage.content) {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('Message Edited')
      .addFields(
        { name: 'Author', value: `${newMessage.author} (${newMessage.author.tag})`, inline: true },
        { name: 'Channel', value: `${newMessage.channel}`, inline: true },
        { name: 'Jump', value: `[Open message](${newMessage.url})`, inline: false },
        { name: 'Old Content', value: (oldMessage.content || 'No content').slice(0, 1024), inline: false },
        { name: 'New Content', value: (newMessage.content || 'No content').slice(0, 1024), inline: false },
      )
      .setTimestamp();

    await sendLog(client, config.channels.messageLogs, { embeds: [embed] });
  },
};

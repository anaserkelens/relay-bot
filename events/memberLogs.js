const { EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    if (!config.channels.memberLogs) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('User Joined')
      .setDescription(`User: ${member.user}\nID: ${member.user.id}\nCreated: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\nMembers: ${member.guild.memberCount}`)
      .setColor(0x2dd4bf)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    await sendLog(client, config.channels.memberLogs, { embeds: [embed] });
  },
};

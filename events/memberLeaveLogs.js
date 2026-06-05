const { EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    if (!config.channels.memberLogs) {
      return;
    }

    const joinedTimestamp = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
    const embed = new EmbedBuilder()
      .setTitle('User Left')
      .setDescription(`User: ${member.user}\nID: ${member.user.id}\nJoined: ${joinedTimestamp}\nMembers: ${member.guild.memberCount}`)
      .setColor(0xff0000)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    await sendLog(client, config.channels.memberLogs, { embeds: [embed] });
  },
};

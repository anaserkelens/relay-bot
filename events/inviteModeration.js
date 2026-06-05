const { EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');
const { sendLog } = require('../utils/channels');

const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (!config.invites.enabled || message.author.bot || !message.guild) {
      return;
    }

    const invites = message.content.match(inviteRegex);

    if (!invites) {
      return;
    }

    const isAllowed = invites.every((invite) =>
      config.invites.allowedPatterns.some((pattern) => invite.toLowerCase().includes(pattern.toLowerCase())),
    );

    if (isAllowed) {
      return;
    }

    await message.delete().catch(() => null);
    await message.member?.timeout(config.invites.timeoutMs, 'Posted unauthorized Discord invite link').catch(() => null);

    if (!config.channels.inviteLogs) {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('Invite Posted')
      .addFields(
        { name: 'Posted By', value: `${message.author} (${message.author.username})`, inline: false },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Invite Link(s)', value: invites.join('\n').slice(0, 1024), inline: false },
        { name: 'Action Taken', value: 'Message deleted and user timed out.', inline: false },
      )
      .setTimestamp();

    await sendLog(client, config.channels.inviteLogs, {
      content: config.roles.staff ? `<@&${config.roles.staff}>` : undefined,
      embeds: [embed],
    });
  },
};

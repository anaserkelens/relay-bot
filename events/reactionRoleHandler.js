const { Events } = require('discord.js');

const { config } = require('../utils/config');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    if (user.bot) {
      return;
    }

    if (!config.reactionRole.messageId || !config.reactionRole.emojiId || !config.roles.verified) {
      return;
    }

    if (reaction.partial) {
      await reaction.fetch().catch(() => null);
    }

    if (reaction.message.id !== config.reactionRole.messageId) {
      return;
    }

    if (reaction.emoji.id !== config.reactionRole.emojiId && reaction.emoji.name !== config.reactionRole.emojiId) {
      return;
    }

    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);

    if (!member || member.roles.cache.has(config.roles.verified)) {
      return;
    }

    await member.roles.add(config.roles.verified).catch((error) => {
      console.error(`Error adding verified role to ${user.tag}:`, error);
    });
  },
};

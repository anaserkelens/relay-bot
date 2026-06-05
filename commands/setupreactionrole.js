const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { config } = require('../utils/config');

const data = new SlashCommandBuilder()
  .setName('setupreactionrole')
  .setDescription('Add the configured verification reaction to the configured message.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!config.reactionRole.messageId || !config.reactionRole.emojiId || !config.roles.verified) {
    await interaction.editReply('Set REACTION_ROLE_MESSAGE_ID, REACTION_ROLE_EMOJI_ID, and VERIFIED_ROLE_ID first.');
    return;
  }

  const channel = await interaction.guild.channels.fetch(config.reactionRole.channelId).catch(() => null);

  if (!channel?.isTextBased()) {
    await interaction.editReply(`Reaction role channel ${config.reactionRole.channelId} was not found.`);
    return;
  }

  const message = await channel.messages.fetch(config.reactionRole.messageId).catch(() => null);

  if (!message) {
    await interaction.editReply(`Reaction role message ${config.reactionRole.messageId} was not found.`);
    return;
  }

  await message.react(config.reactionRole.emojiId);
  await interaction.editReply('Reaction role has been set up.');
}

module.exports = { data, execute };

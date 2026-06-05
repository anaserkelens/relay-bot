const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { config } = require('../utils/config');

const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Delete a specified number of messages.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('Number of messages to delete.')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100),
  );

async function execute(interaction) {
  const hasAdminPermission = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  const hasManageMessages = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
  const hasModeratorRole = config.roles.moderator
    ? interaction.member.roles.cache.has(config.roles.moderator)
    : false;

  if (!hasAdminPermission && !hasManageMessages && !hasModeratorRole) {
    await interaction.reply({
      content: 'You need Manage Messages, Administrator, or the configured moderator role to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const amount = interaction.options.getInteger('amount');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const deletedMessages = await interaction.channel.bulkDelete(amount, true);
    await interaction.editReply(`Deleted ${deletedMessages.size} message(s).`);
  } catch (error) {
    console.error('Error clearing messages:', error);
    await interaction.editReply('Failed to delete messages. Messages older than 14 days cannot be bulk deleted.');
  }
}

module.exports = { data, execute };

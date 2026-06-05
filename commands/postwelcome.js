const fs = require('node:fs');

const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { config } = require('../utils/config');
const {
  createWelcomeMessagePayload,
  welcomeHeaderImageName,
  welcomeHeaderImagePath,
} = require('../utils/welcomeMessage');

const data = new SlashCommandBuilder()
  .setName('postwelcome')
  .setDescription('Post the Interface Society welcome message in the entrance channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'This command can only be used inside the Interface Society server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'Only administrators can post the welcome message.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!fs.existsSync(welcomeHeaderImagePath)) {
    await interaction.editReply(
      `Missing welcome header image. Add ${welcomeHeaderImageName} to the images folder, then try again.`,
    );
    return;
  }

  const channel = await interaction.client.channels.fetch(config.channels.welcome);

  if (!channel?.isSendable()) {
    await interaction.editReply(`Entrance channel ${config.channels.welcome} was not found or is not sendable.`);
    return;
  }

  await channel.send(createWelcomeMessagePayload(welcomeHeaderImagePath));
  await interaction.editReply(`Welcome message posted in <#${config.channels.welcome}>.`);
}

module.exports = { data, execute };

import { access } from 'node:fs/promises';

import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

import { config } from '../utils/config.js';
import {
  createWelcomeMessagePayload,
  welcomeHeaderImageName,
  welcomeHeaderImagePath,
} from '../utils/welcomeMessage.js';

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export const data = new SlashCommandBuilder()
  .setName('postwelcome')
  .setDescription('Post the Interface Society welcome message in the entrance channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

export async function execute(interaction) {
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

  if (!(await fileExists(welcomeHeaderImagePath))) {
    await interaction.editReply(
      `Missing welcome header image. Add ${welcomeHeaderImageName} to the images folder, then try again.`,
    );
    return;
  }

  const channel = await interaction.client.channels.fetch(config.welcomeChannelId);

  if (!channel?.isSendable()) {
    await interaction.editReply(`Entrance channel ${config.welcomeChannelId} was not found or is not sendable.`);
    return;
  }

  await channel.send(createWelcomeMessagePayload(welcomeHeaderImagePath));
  await interaction.editReply(`Welcome message posted in <#${config.welcomeChannelId}>.`);
}

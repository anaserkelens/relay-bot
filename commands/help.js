import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { config } from '../utils/config.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show available bot commands.');

export async function execute(interaction) {
  const commandList = [...interaction.client.commands.values()]
    .map((command) => `/${command.data.name} - ${command.data.description}`)
    .sort()
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x60a5fa)
    .setTitle(`${config.communityName} commands`)
    .setDescription(commandList || 'No commands are loaded yet.');

  await interaction.reply({ embeds: [embed] });
}

import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check whether the bot is online.');

export async function execute(interaction) {
  const roundTripMs = Date.now() - interaction.createdTimestamp;

  await interaction.reply(`Pong. Round trip: ${roundTripMs}ms.`);
}

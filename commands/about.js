import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { config } from '../utils/config.js';

export const data = new SlashCommandBuilder()
  .setName('about')
  .setDescription(`Learn about ${config.communityName}.`);

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x2dd4bf)
    .setTitle(config.communityName)
    .setDescription(config.communityDescription)
    .setFooter({ text: 'Built for the community.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

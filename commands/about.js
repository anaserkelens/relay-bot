const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const { config } = require('../utils/config');

const data = new SlashCommandBuilder()
  .setName('about')
  .setDescription(`Learn about ${config.communityName}.`);

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x2dd4bf)
    .setTitle(config.communityName)
    .setDescription(config.communityDescription)
    .setFooter({ text: 'Built for the community.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = { data, execute };

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check whether the bot is online.');

async function execute(interaction) {
  const roundTripMs = Date.now() - interaction.createdTimestamp;

  await interaction.reply(`Pong. Round trip: ${roundTripMs}ms.`);
}

module.exports = { data, execute };

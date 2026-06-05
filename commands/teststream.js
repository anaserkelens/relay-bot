const { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { config } = require('../utils/config');

const data = new SlashCommandBuilder()
  .setName('teststream')
  .setDescription('Send a test stream announcement preview.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setDescription(`# **${interaction.member} is now live!**\n\n-# ${config.communityName} | Test Stream Title\n\n-# [Watch Stream](https://www.twitch.tv/)`)
    .setColor(0x2dd4bf)
    .setImage('https://static-cdn.jtvnw.net/previews-ttv/live_user_twitch-1920x1080.jpg');

  await interaction.channel.send({ embeds: [embed] });
  await interaction.editReply('Test stream announcement sent.');
}

module.exports = { data, execute };

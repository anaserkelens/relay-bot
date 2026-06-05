const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('server')
  .setDescription('Show basic information about this server.');

async function execute(interaction) {
  const { guild } = interaction;

  if (!guild) {
    await interaction.reply({
      content: 'This command can only be used inside a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xf97316)
    .setTitle(guild.name)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .addFields(
      { name: 'Members', value: guild.memberCount.toLocaleString(), inline: true },
      { name: 'Channels', value: guild.channels.cache.size.toLocaleString(), inline: true },
      {
        name: 'Boosts',
        value: (guild.premiumSubscriptionCount ?? 0).toLocaleString(),
        inline: true,
      },
    )
    .setFooter({ text: `Server ID: ${guild.id}` })
    .setTimestamp(guild.createdAt);

  await interaction.reply({ embeds: [embed] });
}

module.exports = { data, execute };

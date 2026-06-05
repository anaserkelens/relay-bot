const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { config } = require('../utils/config');
const { ContainerBuilder, SeparatorSpacingSize } = require('../utils/components');

const data = new SlashCommandBuilder()
  .setName('ticketsetup')
  .setDescription('Post the ticket setup message in the configured ticket channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!config.channels.tickets) {
    await interaction.editReply('Set TICKET_CHANNEL_ID before using /ticketsetup.');
    return;
  }

  const ticketChannel = await interaction.client.channels.fetch(config.channels.tickets).catch(() => null);

  if (!ticketChannel?.isSendable()) {
    await interaction.editReply(`Ticket channel ${config.channels.tickets} was not found or is not sendable.`);
    return;
  }

  const component = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# SUPPORT\n> Need help or have a question? Click the button below to create a private support ticket.\n\n> Our <@&${config.roles.staff}> team will assist you as soon as possible.`,
      ),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addActionRowComponents((actionRow) =>
      actionRow.addComponents((button) =>
        button.setLabel('Create Ticket').setStyle(3).setCustomId('create_ticket'),
      ),
    );

  await ticketChannel.send(component.toDiscordPayload());
  await interaction.editReply(`Ticket setup message posted in <#${config.channels.tickets}>.`);
}

module.exports = { data, execute };

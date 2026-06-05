const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const { config } = require('../utils/config');
const { fetchSendableChannel } = require('../utils/channels');

const activeTickets = new Map();

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
      await handleTicketCreation(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      await showCloseModal(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'close_ticket_modal') {
      await handleTicketClose(interaction);
    }
  },
};

async function handleTicketCreation(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (!config.channels.tickets) {
    await interaction.editReply('Ticket system is not configured yet.');
    return;
  }

  if (activeTickets.has(interaction.user.id)) {
    const ticketData = activeTickets.get(interaction.user.id);
    await interaction.editReply(`You already have an open ticket: <#${ticketData.threadId}>`);
    return;
  }

  const ticketChannel = await interaction.client.channels.fetch(config.channels.tickets).catch(() => null);

  if (!ticketChannel?.isTextBased()) {
    await interaction.editReply('Ticket channel was not found.');
    return;
  }

  const ticketNumber = Date.now().toString().slice(-6);
  const thread = await ticketChannel.threads.create({
    name: `${interaction.user.username}-${ticketNumber}`,
    type: ChannelType.PrivateThread,
    reason: `Ticket created by ${interaction.user.tag}`,
  });

  await thread.members.add(interaction.user.id);

  const staffRole = await interaction.guild.roles.fetch(config.roles.staff).catch(() => null);

  if (staffRole) {
    for (const [memberId] of staffRole.members) {
      await thread.members.add(memberId).catch(() => null);
    }
  }

  activeTickets.set(interaction.user.id, {
    creatorId: interaction.user.id,
    threadId: thread.id,
  });

  const embed = new EmbedBuilder()
    .setTitle('Support Ticket Created')
    .setDescription(`Welcome ${interaction.user}.\n\nPlease describe your issue or question below. A staff member will be with you shortly.\n\nTicket Number: ${ticketNumber}`)
    .setColor(0x2dd4bf);

  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Close Ticket')
    .setStyle(ButtonStyle.Danger);

  await thread.send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(closeButton)],
  });

  await interaction.editReply(`Ticket created: <#${thread.id}>`);
}

async function showCloseModal(interaction) {
  const modal = new ModalBuilder().setCustomId('close_ticket_modal').setTitle('Close Ticket');
  const reasonInput = new TextInputBuilder()
    .setCustomId('close_reason')
    .setLabel('Reason for closing')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(5)
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  await interaction.showModal(modal);
}

async function handleTicketClose(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const ticketThread = interaction.channel;
  const closeReason = interaction.fields.getTextInputValue('close_reason');
  let ticketCreatorId = null;

  for (const [userId, ticketData] of activeTickets.entries()) {
    if (ticketData.threadId === ticketThread.id) {
      ticketCreatorId = userId;
      activeTickets.delete(userId);
      break;
    }
  }

  const messages = await ticketThread.messages.fetch({ limit: 100 });
  const transcript = messages
    .reverse()
    .map((message) => `[${message.createdAt.toLocaleString()}] ${message.author.tag}: ${message.content}`)
    .join('\n');

  const logChannel = await fetchSendableChannel(interaction.client, config.channels.ticketLogs);

  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setTitle('Ticket Closed')
      .setDescription(`Ticket: ${ticketThread.name}\nClosed by: ${interaction.user}\nReason: ${closeReason}`)
      .setColor(0xff0000)
      .setTimestamp();

    if (transcript.length > 0) {
      await logChannel.send({
        embeds: [logEmbed],
        files: [new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: `${ticketThread.name}-transcript.txt` })],
      });
    } else {
      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  if (ticketCreatorId) {
    const ticketCreator = await interaction.client.users.fetch(ticketCreatorId).catch(() => null);
    await ticketCreator
      ?.send(`Your ticket ${ticketThread.name} has been closed. Reason: ${closeReason}`)
      .catch(() => null);
  }

  await interaction.editReply('Ticket will be closed in 5 seconds.');

  setTimeout(() => {
    ticketThread.delete().catch((error) => console.error('Error deleting ticket thread:', error));
  }, 5000);
}

const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');

const { config } = require('./utils/config');
const { loadCommands } = require('./utils/loadCommands');
const { loadEvents } = require('./utils/loadEvents');
const { startDashboard } = require('./utils/dashboardServer');

function buildIntents() {
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildScheduledEvents,
  ];

  if (config.intents.members) {
    intents.push(GatewayIntentBits.GuildMembers);
  }

  if (config.intents.messageContent) {
    intents.push(GatewayIntentBits.MessageContent);
  }

  if (config.intents.presences) {
    intents.push(GatewayIntentBits.GuildPresences);
  }

  return intents;
}

const client = new Client({
  intents: buildIntents(),
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember],
});

client.commands = new Collection();

for (const command of loadCommands()) {
  client.commands.set(command.data.name, command);
  console.log(`Loaded command: ${command.data.name}`);
}

for (const eventName of loadEvents(client)) {
  console.log(`Loaded event: ${eventName}`);
}

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('warn', (warning) => {
  console.warn('Discord client warning:', warning);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

console.log(`Starting ${config.communityName} Relay bot...`);
startDashboard(client);
client.login(config.discordToken);

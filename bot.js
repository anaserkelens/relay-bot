const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');

const { config } = require('./utils/config');
const { loadCommands } = require('./utils/loadCommands');
const { loadEvents } = require('./utils/loadEvents');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildScheduledEvents,
  ],
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
client.login(config.discordToken);

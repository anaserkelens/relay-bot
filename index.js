import { Client, Collection, GatewayIntentBits } from 'discord.js';

import { config } from './utils/config.js';
import { loadCommands } from './utils/loadCommands.js';
import { loadEvents } from './utils/loadEvents.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

const commands = await loadCommands();

for (const command of commands) {
  client.commands.set(command.data.name, command);
}

await loadEvents(client);

console.log(`Loaded ${client.commands.size} slash commands for ${config.communityName}`);

await client.login(config.discordToken);

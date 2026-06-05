import { REST, Routes } from 'discord.js';

import { config, requireClientId } from './lib/config.js';
import { loadCommands } from './lib/loadCommands.js';

async function main() {
  const clientId = requireClientId();
  const commands = await loadCommands();
  const commandPayload = commands.map((command) => command.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  if (config.guildId) {
    console.log(`Registering ${commandPayload.length} guild commands for ${config.guildId}...`);
    await rest.put(Routes.applicationGuildCommands(clientId, config.guildId), {
      body: commandPayload,
    });
    console.log('Guild slash commands registered.');
    return;
  }

  console.log(`Registering ${commandPayload.length} global commands...`);
  await rest.put(Routes.applicationCommands(clientId), {
    body: commandPayload,
  });
  console.log('Global slash commands registered. They can take a while to appear in Discord.');
}

try {
  await main();
} catch (error) {
  console.error('Failed to register slash commands:', error);
  process.exit(1);
}

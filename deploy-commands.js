import { config } from './utils/config.js';
import { loadCommands } from './utils/loadCommands.js';
import { registerCommandsWithRest } from './utils/syncCommands.js';

async function main() {
  const commands = await loadCommands();
  const result = await registerCommandsWithRest(commands);

  console.log(
    `Registered ${result.count} ${result.scope} slash commands${result.guildId ? ` for ${result.guildId}` : ''}.`,
  );

  if (!config.guildId) {
    console.log('Global slash commands can take a while to appear in Discord.');
  }
}

try {
  await main();
} catch (error) {
  console.error('Failed to register slash commands:', error);
  process.exit(1);
}

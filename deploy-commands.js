const { config } = require('./utils/config');
const { loadCommands } = require('./utils/loadCommands');
const { registerCommandsWithRest } = require('./utils/syncCommands');

async function main() {
  const commands = loadCommands();
  const result = await registerCommandsWithRest(commands);

  console.log(
    `Registered ${result.count} ${result.scope} slash commands${result.guildId ? ` for ${result.guildId}` : ''}.`,
  );

  if (!config.guildId) {
    console.log('Global slash commands can take a while to appear in Discord.');
  }
}

main().catch((error) => {
  console.error('Failed to register slash commands:', error);
  process.exit(1);
});

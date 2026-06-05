const { readdirSync } = require('node:fs');
const path = require('node:path');

const commandsDirectory = path.join(__dirname, '..', 'commands');

function loadCommands() {
  const files = readdirSync(commandsDirectory);
  const commandFiles = files.filter((file) => file.endsWith('.js')).sort();
  const commands = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsDirectory, file);
    const command = require(filePath);

    if (!command.data || typeof command.execute !== 'function') {
      throw new Error(`Command ${file} must export data and execute.`);
    }

    commands.push(command);
  }

  return commands;
}

module.exports = { loadCommands };

import { readdir } from 'node:fs/promises';

const commandsDirectory = new URL('../commands/', import.meta.url);

export async function loadCommands() {
  const files = await readdir(commandsDirectory);
  const commandFiles = files.filter((file) => file.endsWith('.js')).sort();
  const commands = [];

  for (const file of commandFiles) {
    const commandUrl = new URL(file, commandsDirectory);
    const command = await import(commandUrl.href);

    if (!command.data || typeof command.execute !== 'function') {
      throw new Error(`Command ${file} must export data and execute.`);
    }

    commands.push(command);
  }

  return commands;
}

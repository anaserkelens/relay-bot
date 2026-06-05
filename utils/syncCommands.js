import { REST, Routes } from 'discord.js';

import { config } from './config.js';

export function createCommandPayload(commands) {
  return [...commands].map((command) => command.data.toJSON());
}

export async function syncCommandsForClient(client) {
  const body = createCommandPayload(client.commands.values());

  if (config.guildId) {
    await client.application.commands.set(body, config.guildId);
    return { count: body.length, guildId: config.guildId, scope: 'guild' };
  }

  await client.application.commands.set(body);
  return { count: body.length, guildId: undefined, scope: 'global' };
}

export async function registerCommandsWithRest(commands) {
  const body = createCommandPayload(commands);
  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    return { count: body.length, guildId: config.guildId, scope: 'guild' };
  }

  await rest.put(Routes.applicationCommands(config.clientId), { body });
  return { count: body.length, guildId: undefined, scope: 'global' };
}

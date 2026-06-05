import { Events } from 'discord.js';

import { config } from '../utils/config.js';
import { syncCommandsForClient } from '../utils/syncCommands.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  console.log(`Logged in as ${client.user.tag}`);

  if (!config.autoRegisterCommands) {
    console.log('Automatic slash command registration is disabled.');
    return;
  }

  try {
    const result = await syncCommandsForClient(client);
    console.log(
      `Synced ${result.count} ${result.scope} slash commands${result.guildId ? ` for ${result.guildId}` : ''}.`,
    );
  } catch (error) {
    console.error('Failed to sync slash commands on startup:', error);
  }
}

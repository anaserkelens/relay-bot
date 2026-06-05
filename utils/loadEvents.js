import { readdir } from 'node:fs/promises';

const eventsDirectory = new URL('../events/', import.meta.url);

export async function loadEvents(client) {
  const files = await readdir(eventsDirectory);
  const eventFiles = files.filter((file) => file.endsWith('.js')).sort();

  for (const file of eventFiles) {
    const eventUrl = new URL(file, eventsDirectory);
    const event = await import(eventUrl.href);

    if (!event.name || typeof event.execute !== 'function') {
      throw new Error(`Event ${file} must export name and execute.`);
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

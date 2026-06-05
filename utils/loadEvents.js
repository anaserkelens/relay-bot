const { readdirSync } = require('node:fs');
const path = require('node:path');

const eventsDirectory = path.join(__dirname, '..', 'events');

function loadEvents(client) {
  const files = readdirSync(eventsDirectory);
  const eventFiles = files.filter((file) => file.endsWith('.js')).sort();
  const loadedEvents = [];

  for (const file of eventFiles) {
    const filePath = path.join(eventsDirectory, file);
    const event = require(filePath);

    if (typeof event === 'function') {
      event(client);
      loadedEvents.push(file);
      continue;
    }

    if (typeof event.setup === 'function') {
      event.setup(client);
      loadedEvents.push(event.name || file);
      continue;
    }

    if (!event.name || typeof event.execute !== 'function') {
      throw new Error(`Event ${file} must export name and execute.`);
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }

    loadedEvents.push(event.name);
  }

  return loadedEvents;
}

module.exports = { loadEvents };

const fs = require('node:fs/promises');
const path = require('node:path');

const defaultSavedMessagesPath = path.join(__dirname, '..', 'data', 'saved-messages.json');
const welcomeMessageId = 'welcome-message';

const welcomeStarter = `# WELCOME TO INTERFACE SOCIETY
> We're a design-focused community for people who care about good visuals, thoughtful work, and creative culture.
> Share your work, ask for feedback, find inspiration, and connect with other creatives.

# EXTRA INFORMATION
> <a:ifs_calendar:1512493763791032502> **Created:** <t:1741958340:D>
> <a:ifs_link:1512494294068629575> **Invite:** https://discord.gg/CVWJFXWMS6`;

const seededWelcomeMessage = {
  id: welcomeMessageId,
  name: 'Welcome Message',
  channelId: '1350095949896093764',
  image: null,
  blocks: [{ type: 'text', content: welcomeStarter, accessory: null }],
  buttons: [
    {
      label: 'Guidelines',
      url: 'https://discord.com/channels/1350095949896093761/1350104592058159115',
    },
    {
      label: 'Introduce yourself',
      url: 'https://discord.com/channels/1350095949896093761/1511820790759166167',
    },
  ],
  allowMentions: false,
  updatedAt: '2026-06-05T00:00:00.000Z',
};

async function loadSavedMessages(config) {
  const filePath = getSavedMessagesPath(config);
  const storedMessages = await readSavedMessagesFile(filePath);
  const messages = ensureSeedMessage(storedMessages);

  if (messages !== storedMessages) {
    await writeSavedMessagesFile(filePath, messages);
  }

  return messages;
}

async function saveSavedMessages(config, messages) {
  if (!Array.isArray(messages)) {
    throw new Error('Saved messages must be an array.');
  }

  if (messages.length > 100) {
    throw new Error('Use 100 saved messages or fewer.');
  }

  const filePath = getSavedMessagesPath(config);
  const incomingMessages = messages.map(sanitizeSavedMessage).filter(Boolean);
  const storedMessages = await readSavedMessagesFile(filePath);
  const sanitizedMessages = ensureSeedMessage(mergeSavedMessages(incomingMessages, storedMessages));

  await writeSavedMessagesFile(filePath, sanitizedMessages);

  return sanitizedMessages;
}

async function readSavedMessagesFile(filePath) {
  let raw;

  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const parsed = JSON.parse(raw);
  const messages = Array.isArray(parsed) ? parsed : parsed.messages;

  if (!Array.isArray(messages)) {
    throw new Error('Saved messages file must contain an array.');
  }

  return messages.map(sanitizeSavedMessage).filter(Boolean);
}

async function writeSavedMessagesFile(filePath, messages) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  const body = JSON.stringify({ messages }, null, 2);

  await fs.writeFile(temporaryPath, body);
  await fs.rename(temporaryPath, filePath);
}

function getSavedMessagesPath(config) {
  return getSavedMessagesStorageInfo(config).filePath;
}

function getSavedMessagesStorageInfo(config) {
  if (config.dashboard.savedMessagesPath) {
    return {
      filePath: config.dashboard.savedMessagesPath,
      persistent: true,
      source: 'DASHBOARD_SAVED_MESSAGES_PATH',
    };
  }

  if (config.dashboard.railwayVolumeMountPath) {
    return {
      filePath: path.join(config.dashboard.railwayVolumeMountPath, 'saved-messages.json'),
      persistent: true,
      source: 'RAILWAY_VOLUME_MOUNT_PATH',
    };
  }

  return {
    filePath: defaultSavedMessagesPath,
    persistent: false,
    source: 'app filesystem',
  };
}

function ensureSeedMessage(messages) {
  if (messages.some((message) => message.id === welcomeMessageId)) {
    return messages;
  }

  return [seededWelcomeMessage, ...messages];
}

function mergeSavedMessages(primaryMessages, secondaryMessages) {
  const merged = [...primaryMessages];

  for (const secondaryMessage of secondaryMessages) {
    const existingIndex = merged.findIndex((message) => message.id === secondaryMessage.id);

    if (existingIndex === -1) {
      merged.push(secondaryMessage);
      continue;
    }

    if (isNewerSavedMessage(secondaryMessage, merged[existingIndex])) {
      merged[existingIndex] = secondaryMessage;
    }
  }

  return merged;
}

function isNewerSavedMessage(candidate, current) {
  return Date.parse(candidate.updatedAt || '') > Date.parse(current.updatedAt || '');
}

function sanitizeSavedMessage(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  return {
    id: sanitizeText(message.id || createId(), 120),
    name: sanitizeText(message.name || 'Untitled message', 120),
    channelId: sanitizeText(message.channelId || '', 24),
    image: sanitizeImage(message.image),
    blocks: sanitizeBlocks(message),
    buttons: sanitizeButtons(message.buttons),
    allowMentions: Boolean(message.allowMentions),
    updatedAt: sanitizeText(message.updatedAt || new Date().toISOString(), 40),
  };
}

function sanitizeBlocks(message) {
  const sourceBlocks = Array.isArray(message.blocks)
    ? message.blocks
    : (Array.isArray(message.sections) ? message.sections.map((section) => ({ type: 'text', content: section })) : []);

  return sourceBlocks
    .map((block) => {
      const type = String(block?.type || '').toLowerCase();

      if (type === 'text') {
        return {
          type,
          content: sanitizeText(block.content || '', 4000),
          accessory: sanitizeAccessory(block.accessory),
        };
      }

      if (type === 'divider' || type === 'spacer') {
        return {
          type,
          spacing: normalizeBlockSpacing(block.spacing),
        };
      }

      return null;
    })
    .filter(Boolean);
}

function sanitizeButtons(buttons) {
  if (!Array.isArray(buttons)) {
    return [];
  }

  return buttons.map(sanitizeButton).filter((button) => button.label || button.url).slice(0, 5);
}

function sanitizeButton(button) {
  return {
    label: sanitizeText(button?.label || '', 80),
    url: sanitizeText(button?.url || '', 500),
  };
}

function sanitizeAccessory(accessory) {
  if (!accessory || typeof accessory !== 'object') {
    return null;
  }

  const button = sanitizeButton(accessory);

  return button.label || button.url ? button : null;
}

function sanitizeImage(image) {
  if (!image || typeof image !== 'object' || typeof image.dataUrl !== 'string') {
    return null;
  }

  return {
    name: sanitizeText(image.name || 'image', 120),
    dataUrl: image.dataUrl,
  };
}

function normalizeBlockSpacing(spacing) {
  return String(spacing || '').toLowerCase() === 'large' ? 'large' : 'small';
}

function sanitizeText(value, maxLength) {
  return String(value).slice(0, maxLength);
}

function createId() {
  return `message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

module.exports = {
  getSavedMessagesStorageInfo,
  loadSavedMessages,
  saveSavedMessages,
  seededWelcomeMessage,
};

require('dotenv').config({ quiet: true });

function readEnv(name) {
  const value = process.env[name] ? process.env[name].trim() : undefined;
  return value || undefined;
}

function requireEnv(name) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readBoolean(name, fallback = false) {
  const value = readEnv(name);

  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function readInteger(name, fallback) {
  const value = readEnv(name);
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCsv(name, fallback = []) {
  const value = readEnv(name);

  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  discordToken: requireEnv('DISCORD_TOKEN'),
  clientId: readEnv('DISCORD_CLIENT_ID') || readEnv('CLIENT_ID') || '1512406303287541841',
  guildId: readEnv('DISCORD_GUILD_ID') || '1350095949896093761',
  autoRegisterCommands: readBoolean('AUTO_REGISTER_COMMANDS', true),
  presenceText: readEnv('PRESENCE_TEXT') || 'Interface Society',
  communityName: readEnv('COMMUNITY_NAME') || 'Interface Society',
  communityDescription:
    readEnv('COMMUNITY_DESCRIPTION') ||
    'A community space for Interface Society members to connect, share work, and build together.',
  channels: {
    welcome: readEnv('WELCOME_CHANNEL_ID') || '1350095949896093764',
    guidelines: readEnv('GUIDELINES_CHANNEL_ID') || '1350104592058159115',
    introductions: readEnv('INTRODUCTIONS_CHANNEL_ID') || '1511820790759166167',
    rules: readEnv('RULES_CHANNEL_ID') || readEnv('GUIDELINES_CHANNEL_ID') || '1350104592058159115',
    socials: readEnv('SOCIALS_CHANNEL_ID'),
    tickets: readEnv('TICKET_CHANNEL_ID'),
    ticketLogs: readEnv('TICKET_LOG_CHANNEL_ID'),
    memberLogs: readEnv('MEMBER_LOG_CHANNEL_ID'),
    messageLogs: readEnv('MESSAGE_LOG_CHANNEL_ID'),
    channelLogs: readEnv('CHANNEL_LOG_CHANNEL_ID'),
    eventLogs: readEnv('EVENT_LOG_CHANNEL_ID'),
    inviteLogs: readEnv('INVITE_LOG_CHANNEL_ID'),
    modLogs: readEnv('MOD_LOG_CHANNEL_ID'),
    userLogs: readEnv('USER_LOG_CHANNEL_ID'),
    streamAnnouncements: readEnv('ANNOUNCEMENT_CHANNEL_ID'),
  },
  roles: {
    staff: readEnv('STAFF_ROLE_ID') || '1350102611457736775',
    moderator: readEnv('MODERATOR_ROLE_ID'),
    verified: readEnv('VERIFIED_ROLE_ID'),
    streamWhitelist: readEnv('STREAM_WHITELIST_ROLE_ID'),
    live: readEnv('LIVE_ROLE_ID'),
  },
  reactionRole: {
    messageId: readEnv('REACTION_ROLE_MESSAGE_ID'),
    channelId: readEnv('REACTION_ROLE_CHANNEL_ID') || readEnv('RULES_CHANNEL_ID') || '1350104592058159115',
    emojiId: readEnv('REACTION_ROLE_EMOJI_ID'),
  },
  invites: {
    enabled: readBoolean('INVITE_MODERATION_ENABLED', false),
    allowedPatterns: readCsv('ALLOWED_INVITE_PATTERNS', ['CVWJFXWMS6', 'discord.gg/CVWJFXWMS6']),
    timeoutMs: readInteger('INVITE_TIMEOUT_MS', 60000),
  },
  streamMonitor: {
    enabled: readBoolean('STREAM_MONITOR_ENABLED', false),
    titleKeyword: readEnv('STREAM_TITLE_KEYWORD') || 'INTERFACE SOCIETY',
    gameNameIncludes: readEnv('STREAM_GAME_NAME_INCLUDES'),
  },
};

config.intents = {
  members: readBoolean('ENABLE_SERVER_MEMBERS_INTENT', false),
  messageContent: readBoolean('ENABLE_MESSAGE_CONTENT_INTENT', config.invites.enabled),
  presences: readBoolean('ENABLE_PRESENCE_INTENT', config.streamMonitor.enabled),
};

module.exports = {
  config,
  readBoolean,
  readCsv,
  readEnv,
};

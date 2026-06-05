import 'dotenv/config';

function readEnv(name) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function requireEnv(name) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const config = {
  discordToken: requireEnv('DISCORD_TOKEN'),
  clientId: readEnv('DISCORD_CLIENT_ID'),
  guildId: readEnv('DISCORD_GUILD_ID'),
  welcomeChannelId: readEnv('WELCOME_CHANNEL_ID') ?? '1350095949896093764',
  communityName: readEnv('COMMUNITY_NAME') ?? 'Interface Society',
  communityDescription:
    readEnv('COMMUNITY_DESCRIPTION') ??
    'A community space for Interface Society members to connect, share work, and build together.',
};

export function requireClientId() {
  return requireEnv('DISCORD_CLIENT_ID');
}

# Interface Society Relay Bot

A Discord.js bot starter for the Interface Society community, ready to run locally and deploy to Railway.

## What It Does

- Registers slash commands with Discord.
- Runs a long-lived Discord bot process for Railway.
- Keeps secrets in environment variables instead of files.
- Includes `/ping`, `/about`, `/server`, and `/help`.
- Includes `/postwelcome` for administrators to post the Interface Society welcome message.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in:

   ```bash
   DISCORD_TOKEN=...
   DISCORD_CLIENT_ID=...
   DISCORD_GUILD_ID=...
   WELCOME_CHANNEL_ID=1350095949896093764
   AUTO_REGISTER_COMMANDS=true
   ```

3. Add your welcome header image at `images/IFS_Welcome_Header.png`.

4. Start the bot:

   ```bash
   npm start
   ```

The bot automatically registers slash commands on startup when `AUTO_REGISTER_COMMANDS` is not set to `false`.

You can also register commands manually:

   ```bash
   npm run deploy:commands
   ```

## Discord Developer Portal Values

- `DISCORD_TOKEN`: Bot page -> Token.
- `DISCORD_CLIENT_ID`: General Information -> Application ID.
- `DISCORD_GUILD_ID`: Right-click your Discord server -> Copy Server ID. Developer Mode must be enabled in Discord settings.

Invite the bot with both `bot` and `applications.commands` scopes. The welcome command needs the bot to be able to send messages and attach files in the entrance channel.

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=34816&scope=bot%20applications.commands
```

## Railway Deployment

1. Push this repo to GitHub.
2. In Railway, create a new project and choose the GitHub repo.
3. Add these Railway variables:

   ```text
   DISCORD_TOKEN
   DISCORD_CLIENT_ID
   DISCORD_GUILD_ID
   WELCOME_CHANNEL_ID
   AUTO_REGISTER_COMMANDS
   COMMUNITY_NAME
   COMMUNITY_DESCRIPTION
   ```

4. Deploy. Railway will run `npm start` from `railway.toml`.

Slash commands are synced on startup. If `DISCORD_GUILD_ID` is set, commands update instantly in that server. Without it, commands are global and can take a while to appear.

`/postwelcome` is administrator-only, so Discord will only show it to members who can use administrator commands.

## Adding Commands

Create a new file in `commands` that exports:

```js
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('example')
  .setDescription('Describe the command.');

export async function execute(interaction) {
  await interaction.reply('Hello from Interface Society.');
}
```

Then run:

```bash
npm run deploy:commands
```

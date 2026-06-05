# Interface Society Relay Bot

A Discord.js bot starter for the Interface Society community, ready to run locally and deploy to Railway.

## What It Does

- Registers slash commands with Discord.
- Runs a long-lived Discord bot process for Railway.
- Keeps secrets in environment variables instead of files.
- Uses the same folder shape as the reference bot: `commands`, `events`, `images`, and `utils`.
- Includes `/ping`, `/about`, `/server`, `/help`, `/clear`, `/postwelcome`, `/ticketsetup`, `/setupreactionrole`, and `/teststream`.
- Includes optional event systems for tickets, member logs, message logs, channel logs, scheduled event logs, moderation logs, user logs, invite moderation, reaction roles, and stream monitoring.

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

Enable these privileged gateway intents in the Bot page if you want the imported reference systems to work:

- Presence Intent
- Server Members Intent
- Message Content Intent

Invite the bot with both `bot` and `applications.commands` scopes. The imported systems need message, moderation, member, invite, reaction, and thread permissions.

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=412317273088&scope=bot%20applications.commands
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
   PRESENCE_TEXT
   COMMUNITY_NAME
   COMMUNITY_DESCRIPTION
   ```

4. Deploy. Railway will run `npm start` from `railway.toml`.

Slash commands are synced on startup. If `DISCORD_GUILD_ID` is set, commands update instantly in that server. Without it, commands are global and can take a while to appear.

`/postwelcome` is administrator-only, so Discord will only show it to members who can use administrator commands.

Optional systems are controlled by environment variables. For example, tickets need `TICKET_CHANNEL_ID`, ticket logs need `TICKET_LOG_CHANNEL_ID`, and reaction roles need `REACTION_ROLE_MESSAGE_ID`, `REACTION_ROLE_EMOJI_ID`, and `VERIFIED_ROLE_ID`. See [.env.example](.env.example) for the full list.

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

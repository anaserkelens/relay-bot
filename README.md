# Interface Society Relay Bot

A Discord.js bot starter for the Interface Society community, ready to run locally and deploy to Railway.

## What It Does

- Registers slash commands with Discord.
- Runs a long-lived Discord bot process for Railway.
- Keeps secrets in environment variables instead of files.
- Uses the same folder shape as the reference bot: `commands`, `events`, `images`, and `utils`.
- Includes a protected browser dashboard for sending Components v2 messages instantly.
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
   DASHBOARD_PASSWORD=...
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

Enable these privileged gateway intents in the Bot page only if you also enable their matching Railway variables:

- Presence Intent -> `ENABLE_PRESENCE_INTENT=true`
- Server Members Intent -> `ENABLE_SERVER_MEMBERS_INTENT=true`
- Message Content Intent -> `ENABLE_MESSAGE_CONTENT_INTENT=true`

Leave those Railway variables `false` while getting the bot online for the first time. Core slash commands and `/postwelcome` do not need privileged intents.

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
   ENABLE_SERVER_MEMBERS_INTENT
   ENABLE_MESSAGE_CONTENT_INTENT
   ENABLE_PRESENCE_INTENT
   COMMUNITY_NAME
   COMMUNITY_DESCRIPTION
   ```

4. Deploy. Railway will run `npm start` from `railway.toml`.

Slash commands are synced on startup. If `DISCORD_GUILD_ID` is set, commands update instantly in that server. Without it, commands are global and can take a while to appear.

`/postwelcome` is administrator-only, so Discord will only show it to members who can use administrator commands.

Optional systems are controlled by environment variables. For example, tickets need `TICKET_CHANNEL_ID`, ticket logs need `TICKET_LOG_CHANNEL_ID`, and reaction roles need `REACTION_ROLE_MESSAGE_ID`, `REACTION_ROLE_EMOJI_ID`, and `VERIFIED_ROLE_ID`. See [.env.example](.env.example) for the full list.

## Dashboard

Set `DASHBOARD_PASSWORD` in Railway to enable the browser dashboard. Railway will expose it at your service URL:

```text
https://your-service.up.railway.app/
```

The dashboard sends messages through the running bot, so no restart or slash command is needed. The bot must already be online, and it must have permission to send messages and attach files in the target channel.

## Adding Commands

Create a new file in `commands` that exports:

```js
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('example')
  .setDescription('Describe the command.');

async function execute(interaction) {
  await interaction.reply('Hello from Interface Society.');
}

module.exports = { data, execute };
```

Then run:

```bash
npm run deploy:commands
```

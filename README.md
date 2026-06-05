# Interface Society Relay Bot

A Discord.js bot starter for the Interface Society community, ready to run locally and deploy to Railway.

## What It Does

- Registers slash commands with Discord.
- Runs a long-lived Discord bot process for Railway.
- Keeps secrets in environment variables instead of files.
- Includes `/ping`, `/about`, `/server`, and `/help`.

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
   ```

3. Register slash commands:

   ```bash
   npm run deploy:commands
   ```

4. Start the bot:

   ```bash
   npm start
   ```

## Discord Developer Portal Values

- `DISCORD_TOKEN`: Bot page -> Token.
- `DISCORD_CLIENT_ID`: General Information -> Application ID.
- `DISCORD_GUILD_ID`: Right-click your Discord server -> Copy Server ID. Developer Mode must be enabled in Discord settings.

Invite the bot with both `bot` and `applications.commands` scopes. For the starter commands, no elevated bot permissions are required.

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=0&scope=bot%20applications.commands
```

## Railway Deployment

1. Push this repo to GitHub.
2. In Railway, create a new project and choose the GitHub repo.
3. Add these Railway variables:

   ```text
   DISCORD_TOKEN
   DISCORD_CLIENT_ID
   COMMUNITY_NAME
   COMMUNITY_DESCRIPTION
   ```

4. Deploy. Railway will run `npm start` from `railway.toml`.

For first-time command registration, run `npm run deploy:commands` locally with the same bot token. If `DISCORD_GUILD_ID` is set, commands update instantly in that server. Without it, commands are global and can take a while to appear.

## Adding Commands

Create a new file in `src/commands` that exports:

```js
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

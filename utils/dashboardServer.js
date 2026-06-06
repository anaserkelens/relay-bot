const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { ActivityType } = require('discord.js');

const { config } = require('./config');
const { createDashboardMessagePayload } = require('./dashboardMessage');
const { getSavedMessagesStorageInfo, loadSavedMessages, saveSavedMessages } = require('./savedMessages');

const dashboardDirectory = path.join(__dirname, '..', 'dashboard');
const sessionCookieName = 'relay_dashboard';
const allowedPresenceStatuses = new Set(['online', 'idle', 'dnd', 'invisible']);
const activityTypes = {
  Playing: ActivityType.Playing,
  Streaming: ActivityType.Streaming,
  Listening: ActivityType.Listening,
  Watching: ActivityType.Watching,
  Competing: ActivityType.Competing,
};
let activePresence = {
  status: 'online',
  activityType: 'Watching',
  activityName: config.presenceText,
  activityUrl: '',
};

function startDashboard(client) {
  if (!config.dashboard.enabled) {
    console.log('Dashboard disabled.');
    return null;
  }

  if (!config.dashboard.password) {
    console.log('Dashboard disabled. Set DASHBOARD_PASSWORD to enable it.');
    return null;
  }

  logSavedMessagesStorage();

  const server = http.createServer((request, response) => {
    handleRequest(client, request, response).catch((error) => {
      console.error('Dashboard request error:', error);
      sendJson(response, 500, { error: 'Dashboard server error.' });
    });
  });

  server.on('error', (error) => {
    console.error('Dashboard server failed:', error);
  });

  server.listen(config.dashboard.port, () => {
    console.log(`Dashboard listening on port ${config.dashboard.port}.`);
  });

  return server;
}

function logSavedMessagesStorage() {
  const storage = getSavedMessagesStorageInfo(config);

  console.log(
    `Dashboard saved messages storage: ${storage.filePath} (${storage.persistent ? 'persistent' : 'ephemeral'}, ${storage.source}).`,
  );

  if (!storage.persistent) {
    console.warn('Dashboard saved messages will reset after redeploys unless a Railway volume is attached.');
  }
}

async function handleRequest(client, request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (shouldLogDashboardRequest(request.method, url.pathname)) {
    console.log(`Dashboard request: ${request.method} ${url.pathname}`);
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      botReady: client.isReady(),
      dashboardEnabled: true,
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/ping') {
    sendJson(response, 200, {
      ok: true,
      botReady: client.isReady(),
      tag: client.user?.tag || null,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/login') {
    await handleClassicLogin(client, request, response);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/login') {
    await handleLogin(client, request, response);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/logout') {
    setCookie(response, sessionCookieName, '', { maxAge: 0, secure: isSecureRequest(request) });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    if (!isAuthenticated(request)) {
      sendJson(response, 401, { error: 'Not authenticated.' });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/session') {
      sendJson(response, 200, { ok: true, botReady: client.isReady(), tag: client.user?.tag || null });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/saved-messages') {
      await handleGetSavedMessages(response);
      return;
    }

    if (request.method === 'PUT' && url.pathname === '/api/saved-messages') {
      await handleSaveSavedMessages(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/import-message') {
      await handleImportMessage(client, request, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/bot') {
      await handleGetBot(client, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/bot/presence') {
      await handleUpdatePresence(client, request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/bot/avatar') {
      await handleUpdateBotImage(client, request, response, 'avatar');
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/bot/banner') {
      await handleUpdateBotImage(client, request, response, 'banner');
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/send-message') {
      await handleSendMessage(client, request, response);
      return;
    }

    sendJson(response, 404, { error: 'Unknown API route.' });
    return;
  }

  serveStatic(url.pathname, response);
}

async function handleLogin(client, request, response) {
  console.log('Dashboard login API request received.');
  const body = await readJsonBody(request, 64 * 1024);

  if (!isDashboardPassword(String(body.password || ''))) {
    console.warn('Dashboard login failed.');
    sendJson(response, 401, { error: 'Invalid password.' });
    return;
  }

  console.log('Dashboard login succeeded.');
  const sessionToken = createSessionValue();

  setCookie(response, sessionCookieName, sessionToken, {
    maxAge: 7 * 24 * 60 * 60,
    secure: isSecureRequest(request),
  });
  sendJson(response, 200, { ok: true, botReady: client.isReady(), tag: client.user?.tag || null, sessionToken });
}

async function handleClassicLogin(client, request, response) {
  console.log('Dashboard basic login request received.');
  const body = await readFormBody(request, 64 * 1024);

  if (!isDashboardPassword(String(body.password || ''))) {
    console.warn('Dashboard basic login failed.');
    redirect(response, '/?loginError=invalid');
    return;
  }

  console.log('Dashboard basic login succeeded.');
  setCookie(response, sessionCookieName, createSessionValue(), {
    maxAge: 7 * 24 * 60 * 60,
    secure: isSecureRequest(request),
  });
  redirect(response, '/');
}

async function handleSendMessage(client, request, response) {
  if (!client.isReady()) {
    sendJson(response, 503, { error: 'Bot is not ready yet.' });
    return;
  }

  const body = await readJsonBody(request, config.dashboard.maxBodyBytes);
  const channelId = String(body.channelId || '').trim();

  if (!/^\d{17,20}$/.test(channelId)) {
    sendJson(response, 400, { error: 'Channel ID must be a Discord snowflake.' });
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || typeof channel.isSendable !== 'function' || !channel.isSendable()) {
    sendJson(response, 404, { error: 'Channel was not found or is not sendable by the bot.' });
    return;
  }

  let payload;

  try {
    payload = createDashboardMessagePayload(body, config);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const message = await channel.send(payload);

  sendJson(response, 200, {
    ok: true,
    channelId,
    messageId: message.id,
    url: message.url,
  });
}

async function handleGetSavedMessages(response) {
  const messages = await loadSavedMessages(config);

  sendJson(response, 200, {
    ok: true,
    messages,
  });
}

async function handleSaveSavedMessages(request, response) {
  const body = await readJsonBody(request, config.dashboard.maxBodyBytes);
  let messages;

  try {
    messages = await saveSavedMessages(config, body.messages);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    messages,
  });
}

async function handleImportMessage(client, request, response) {
  if (!client.isReady()) {
    sendJson(response, 503, { error: 'Bot is not ready yet.' });
    return;
  }

  const body = await readJsonBody(request, 256 * 1024);
  let target;

  try {
    target = parseDiscordMessageLink(body.url || body.messageUrl || body.messageLink);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const channel = await client.channels.fetch(target.channelId).catch(() => null);

  if (!channel || !channel.messages || typeof channel.messages.fetch !== 'function') {
    sendJson(response, 404, { error: 'Message channel was not found or is not readable by the bot.' });
    return;
  }

  const message = await channel.messages.fetch(target.messageId).catch(() => null);

  if (!message) {
    sendJson(response, 404, { error: 'Discord message was not found.' });
    return;
  }

  let importedMessage;

  try {
    importedMessage = await createSavedMessageFromDiscordMessage(message, body.name);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const currentMessages = await loadSavedMessages(config);
  const existingIndex = currentMessages.findIndex((savedMessage) => savedMessage.id === importedMessage.id);
  const nextMessages = [...currentMessages];

  if (existingIndex >= 0) {
    nextMessages[existingIndex] = importedMessage;
  } else {
    nextMessages.unshift(importedMessage);
  }

  const messages = await saveSavedMessages(config, nextMessages);

  sendJson(response, 200, {
    ok: true,
    message: importedMessage,
    messages,
  });
}

function parseDiscordMessageLink(value) {
  const match = String(value || '').match(
    /^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})(?:\?.*)?$/i,
  );

  if (!match) {
    throw new Error('Paste a valid Discord message link.');
  }

  return {
    guildId: match[1],
    channelId: match[2],
    messageId: match[3],
  };
}

async function createSavedMessageFromDiscordMessage(message, requestedName) {
  const blocks = [];
  const buttons = [];
  let image = null;
  const components = normalizeComponentArray(message.components);

  for (const component of components) {
    const componentImage = await collectSavedMessageComponents(component, message, blocks, buttons);

    if (!image && componentImage) {
      image = componentImage;
    }
  }

  if (!image && message.attachments?.size) {
    image = await importFirstImageAttachment(message);
  }

  if (!image && blocks.length === 0 && buttons.length === 0) {
    throw new Error('That message does not contain importable Components v2 content.');
  }

  const name = String(requestedName || '').trim() || deriveSavedMessageName(blocks) || 'Imported Message';

  return {
    id: `discord-message-${message.id}`,
    name,
    channelId: message.channelId || '',
    image,
    blocks,
    buttons,
    allowMentions: false,
    updatedAt: new Date().toISOString(),
  };
}

async function collectSavedMessageComponents(component, message, blocks, buttons) {
  if (!component || typeof component !== 'object') {
    return null;
  }

  const data = toComponentData(component);

  if (data.type === 17 && Array.isArray(data.components)) {
    let image = null;

    for (const child of data.components) {
      const componentImage = await collectSavedMessageComponents(child, message, blocks, buttons);

      if (!image && componentImage) {
        image = componentImage;
      }
    }

    return image;
  }

  if (data.type === 12) {
    return importMediaGalleryImage(data, message);
  }

  if (data.type === 14) {
    blocks.push({
      type: data.divider ? 'divider' : 'spacer',
      spacing: data.spacing === 2 ? 'large' : 'small',
    });
    return null;
  }

  if (data.type === 10 && data.content) {
    blocks.push({
      type: 'text',
      content: String(data.content),
      accessory: null,
    });
    return null;
  }

  if (data.type === 9) {
    const content = normalizeComponentArray(data.components)
      .filter((child) => child.type === 10 && child.content)
      .map((child) => String(child.content))
      .join('\n');

    if (content) {
      blocks.push({
        type: 'text',
        content,
        accessory: normalizeLinkButton(data.accessory),
      });
    }

    return null;
  }

  if (data.type === 1) {
    for (const child of normalizeComponentArray(data.components)) {
      const button = normalizeLinkButton(child);

      if (button) {
        buttons.push(button);
      }
    }
  }

  return null;
}

function normalizeComponentArray(components) {
  return Array.isArray(components) ? components.map(toComponentData).filter(Boolean) : [];
}

function toComponentData(component) {
  if (!component) {
    return null;
  }

  if (typeof component.toJSON === 'function') {
    return component.toJSON();
  }

  return component;
}

function normalizeLinkButton(component) {
  const button = toComponentData(component);

  if (!button || button.type !== 2 || !button.url) {
    return null;
  }

  return {
    label: String(button.label || 'Open'),
    url: String(button.url),
  };
}

async function importMediaGalleryImage(component, message) {
  const item = Array.isArray(component.items) ? component.items[0] : null;
  const url = item?.media?.url;

  if (!url) {
    return null;
  }

  if (String(url).startsWith('attachment://')) {
    const fileName = String(url).replace('attachment://', '');
    const attachment = message.attachments?.find?.((item) => item.name === fileName);

    return attachment ? importImageUrl(attachment.url, attachment.name) : null;
  }

  return importImageUrl(url, 'imported-image');
}

async function importFirstImageAttachment(message) {
  const attachment = message.attachments?.find?.((item) => String(item.contentType || '').startsWith('image/'));

  return attachment ? importImageUrl(attachment.url, attachment.name) : null;
}

async function importImageUrl(url, name) {
  if (!/^https?:\/\//i.test(String(url || ''))) {
    return null;
  }

  const response = await fetch(url).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const mimeType = String(response.headers.get('content-type') || '').split(';')[0];

  if (!['image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > config.dashboard.maxUploadBytes) {
    return null;
  }

  return {
    name: String(name || 'imported-image'),
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
  };
}

function deriveSavedMessageName(blocks) {
  const textBlock = blocks.find((block) => block.type === 'text' && block.content.trim());

  if (!textBlock) {
    return '';
  }

  return textBlock.content
    .split('\n')[0]
    .replace(/^#+\s*/, '')
    .replace(/[*_`~|>]/g, '')
    .trim()
    .slice(0, 80);
}

async function handleGetBot(client, response) {
  sendJson(response, 200, await createBotState(client));
}

async function handleUpdatePresence(client, request, response) {
  if (!client.isReady()) {
    sendJson(response, 503, { error: 'Bot is not ready yet.' });
    return;
  }

  const body = await readJsonBody(request, 64 * 1024);
  let presence;

  try {
    presence = normalizePresenceBody(body);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const activity = createDiscordActivity(presence);

  client.user.setPresence({
    activities: activity ? [activity] : [],
    status: presence.status,
  });

  activePresence = presence;

  sendJson(response, 200, await createBotState(client));
}

async function handleUpdateBotImage(client, request, response, kind) {
  if (!client.isReady()) {
    sendJson(response, 503, { error: 'Bot is not ready yet.' });
    return;
  }

  const body = await readJsonBody(request, config.dashboard.maxBodyBytes);
  let image;

  try {
    image = normalizeBotImage(body.image, kind);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    if (kind === 'avatar') {
      await client.user.setAvatar(image.buffer);
    } else {
      await client.user.setBanner(image.buffer);
    }
  } catch (error) {
    sendJson(response, 400, { error: createBotProfileError(error, kind) });
    return;
  }

  sendJson(response, 200, await createBotState(client));
}

async function createBotState(client) {
  const user = client.user || null;

  if (client.isReady() && user && typeof user.fetch === 'function') {
    await user.fetch(true).catch(() => null);
  }

  return {
    ok: true,
    botReady: client.isReady(),
    id: user?.id || null,
    tag: user?.tag || null,
    username: user?.username || null,
    avatarUrl: getAvatarUrl(user),
    bannerUrl: getBannerUrl(user),
    presence: activePresence,
  };
}

function normalizePresenceBody(body) {
  const status = String(body.status || 'online').trim().toLowerCase();
  const activityType = normalizeActivityType(body.activityType);
  const activityName = String(body.activityName || '').trim();
  const activityUrl = String(body.activityUrl || '').trim();

  if (!allowedPresenceStatuses.has(status)) {
    throw new Error('Status must be online, idle, dnd, or invisible.');
  }

  if (activityName.length > 128) {
    throw new Error('Activity text must be 128 characters or fewer.');
  }

  if (activityType === 'Streaming') {
    if (!activityName) {
      throw new Error('Streaming presence needs activity text.');
    }

    assertHttpUrl(activityUrl, 'Streaming URL');
  }

  return {
    status,
    activityType,
    activityName,
    activityUrl: activityType === 'Streaming' ? activityUrl : '',
  };
}

function normalizeActivityType(value) {
  const normalized = String(value || 'Watching').trim().toLowerCase();
  const match = Object.keys(activityTypes).find((type) => type.toLowerCase() === normalized);

  if (!match) {
    throw new Error('Activity type must be Playing, Watching, Listening, Competing, or Streaming.');
  }

  return match;
}

function createDiscordActivity(presence) {
  if (!presence.activityName) {
    return null;
  }

  const activity = {
    name: presence.activityName,
    type: activityTypes[presence.activityType],
  };

  if (presence.activityType === 'Streaming') {
    activity.url = presence.activityUrl;
  }

  return activity;
}

function normalizeBotImage(image, kind) {
  if (!image?.dataUrl) {
    throw new Error(`Choose a ${kind} image first.`);
  }

  const match = String(image.dataUrl).match(/^data:(image\/(?:gif|jpeg|jpg|png|webp));base64,([a-z0-9+/=]+)$/i);

  if (!match) {
    throw new Error('Image upload must be a PNG, JPG, GIF, or WebP data URL.');
  }

  const buffer = Buffer.from(match[2], 'base64');

  if (!buffer.length) {
    throw new Error('Image upload was empty.');
  }

  if (buffer.length > config.dashboard.maxUploadBytes) {
    throw new Error(`Image must be ${Math.floor(config.dashboard.maxUploadBytes / 1024 / 1024)} MB or smaller.`);
  }

  return {
    buffer,
    mimeType: match[1],
  };
}

function getAvatarUrl(user) {
  if (!user || typeof user.displayAvatarURL !== 'function') {
    return null;
  }

  return user.displayAvatarURL({ size: 256 });
}

function getBannerUrl(user) {
  if (!user || typeof user.bannerURL !== 'function') {
    return null;
  }

  return user.bannerURL({ size: 512 });
}

function createBotProfileError(error, kind) {
  const message = error?.rawError?.message || error?.message || `Could not update bot ${kind}.`;

  if (String(message).toLowerCase().includes('rate')) {
    return `Discord is rate limiting bot profile changes right now. Try again later. ${message}`;
  }

  return message;
}

function assertHttpUrl(value, label) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${label} must start with http or https.`);
  }
}

function serveStatic(pathname, response) {
  const route = pathname === '/' ? '/index.html' : pathname;
  const requestedPath = path.normalize(route).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(dashboardDirectory, requestedPath);

  if (!filePath.startsWith(dashboardDirectory)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(response, 404, 'Not found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  };

  response.writeHead(200, {
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(response);
}

function readJsonBody(request, maxBytes) {
  return readTextBody(request, maxBytes).then((body) => {
    if (!body) {
      return {};
    }

    try {
      return JSON.parse(body);
    } catch {
      throw new Error('Request body must be valid JSON.');
    }
  });
}

function readFormBody(request, maxBytes) {
  return readTextBody(request, maxBytes).then((body) => Object.fromEntries(new URLSearchParams(body)));
}

function readTextBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;

    request.setEncoding('utf8');

    request.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);

      if (bytes > maxBytes) {
        reject(new Error('Request body is too large.'));
        request.destroy();
        return;
      }

      body += chunk;
    });

    request.on('end', () => {
      resolve(body);
    });

    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function redirect(response, location) {
  response.writeHead(303, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  response.end();
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(text);
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || '')
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf('=');
        return [cookie.slice(0, separatorIndex), decodeURIComponent(cookie.slice(separatorIndex + 1))];
      }),
  );
}

function isAuthenticated(request) {
  const cookie = parseCookies(request)[sessionCookieName];
  const bearerToken = readBearerToken(request);
  const expected = createSessionValue();

  return matchesSessionValue(cookie, expected) || matchesSessionValue(bearerToken, expected);
}

function createSessionValue() {
  return crypto.createHmac('sha256', config.dashboard.password).update('relay-dashboard-session').digest('hex');
}

function matchesSessionValue(value, expected) {
  if (!value || value.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

function readBearerToken(request) {
  const authorization = String(request.headers.authorization || '');
  const [scheme, token] = authorization.split(/\s+/, 2);

  return scheme.toLowerCase() === 'bearer' ? token : undefined;
}

function setCookie(response, name, value, options = {}) {
  const attributes = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];

  if (options.maxAge !== undefined) {
    attributes.push(`Max-Age=${options.maxAge}`);
  }

  if (options.secure) {
    attributes.push('Secure');
  }

  response.setHeader('Set-Cookie', attributes.join('; '));
}

function isSecureRequest(request) {
  return request.headers['x-forwarded-proto'] === 'https' || request.socket.encrypted;
}

function isDashboardPassword(value) {
  return value.trim() === config.dashboard.password;
}

function shouldLogDashboardRequest(method, pathname) {
  return pathname === '/health' || pathname === '/login' || pathname.startsWith('/api/') || method !== 'GET';
}

module.exports = {
  startDashboard,
};

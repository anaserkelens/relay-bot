const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { ActivityType } = require('discord.js');

const { config } = require('./config');
const { createDashboardMessagePayload } = require('./dashboardMessage');

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

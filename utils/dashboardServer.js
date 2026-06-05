const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { config } = require('./config');
const { createDashboardMessagePayload } = require('./dashboardMessage');

const dashboardDirectory = path.join(__dirname, '..', 'dashboard');
const sessionCookieName = 'relay_dashboard';

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

  server.listen(config.dashboard.port, () => {
    console.log(`Dashboard listening on port ${config.dashboard.port}.`);
  });

  return server;
}

async function handleRequest(client, request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      botReady: client.isReady(),
      dashboardEnabled: true,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/login') {
    await handleLogin(request, response);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/logout') {
    setCookie(response, sessionCookieName, '', { maxAge: 0 });
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

    if (request.method === 'POST' && url.pathname === '/api/send-message') {
      await handleSendMessage(client, request, response);
      return;
    }

    sendJson(response, 404, { error: 'Unknown API route.' });
    return;
  }

  serveStatic(url.pathname, response);
}

async function handleLogin(request, response) {
  const body = await readJsonBody(request, 64 * 1024);

  if (String(body.password || '') !== config.dashboard.password) {
    sendJson(response, 401, { error: 'Invalid password.' });
    return;
  }

  setCookie(response, sessionCookieName, createSessionValue(), { maxAge: 7 * 24 * 60 * 60 });
  sendJson(response, 200, { ok: true });
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
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
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
  const expected = createSessionValue();

  if (!cookie || cookie.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(expected));
}

function createSessionValue() {
  return crypto.createHmac('sha256', config.dashboard.password).update('relay-dashboard-session').digest('hex');
}

function setCookie(response, name, value, options = {}) {
  const attributes = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];

  if (options.maxAge !== undefined) {
    attributes.push(`Max-Age=${options.maxAge}`);
  }

  response.setHeader('Set-Cookie', attributes.join('; '));
}

module.exports = {
  startDashboard,
};

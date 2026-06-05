const loginView = document.querySelector('#login-view');
const dashboardView = document.querySelector('#dashboard-view');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const loginButton = document.querySelector('#login-button');
const basicLoginButton = document.querySelector('#basic-login-button');
const apiStatus = document.querySelector('#api-status');
const passwordInput = document.querySelector('#password');
const logoutButton = document.querySelector('#logout');
const botStatus = document.querySelector('#bot-status');
const overviewBotStatus = document.querySelector('#overview-bot-status');
const dashboardApiStatus = document.querySelector('#dashboard-api-status');
const savedMessagesContainer = document.querySelector('#saved-messages');
const savedMessageCount = document.querySelector('#saved-message-count');
const tabButtons = [...document.querySelectorAll('.tab-button')];
const tabLinks = [...document.querySelectorAll('[data-tab-link]')];
const tabPanels = [...document.querySelectorAll('.tab-panel')];
const composer = document.querySelector('#composer');
const messageNameInput = document.querySelector('#message-name');
const channelInput = document.querySelector('#channel-id');
const imageInput = document.querySelector('#image-file');
const allowMentionsInput = document.querySelector('#allow-mentions');
const sectionsContainer = document.querySelector('#sections');
const buttonsContainer = document.querySelector('#buttons');
const addSectionButton = document.querySelector('#add-section');
const addButtonButton = document.querySelector('#add-button');
const newMessageButton = document.querySelector('#new-message');
const saveMessageButton = document.querySelector('#save-message');
const sendButton = document.querySelector('#send');
const sendStatus = document.querySelector('#send-status');
const previewImage = document.querySelector('#preview-image');
const previewSections = document.querySelector('#preview-sections');
const previewButtons = document.querySelector('#preview-buttons');
const sectionCount = document.querySelector('#section-count');
const sessionStorageKey = 'relay_dashboard_session';
const savedMessagesStorageKey = 'relay_dashboard_saved_messages';
const welcomeMessageId = 'welcome-message';

const state = {
  currentMessageId: null,
  image: null,
  savedMessages: [],
  composerInitialized: false,
};

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
  sections: [welcomeStarter],
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

init();

async function init() {
  bindEvents();
  loadSavedMessages();
  renderSavedMessages();

  checkApiStatus();

  const session = await api('/api/session').catch(() => null);

  if (session?.ok) {
    showDashboard(session);
  } else {
    clearSessionToken();
    showLogin();
  }
}

function bindEvents() {
  loginForm.addEventListener('submit', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  tabButtons.forEach((button) => button.addEventListener('click', () => setActiveTab(button.dataset.tab)));
  tabLinks.forEach((button) => button.addEventListener('click', () => setActiveTab(button.dataset.tabLink)));
  composer.addEventListener('submit', handleSend);
  savedMessagesContainer.addEventListener('click', handleSavedMessageClick);
  imageInput.addEventListener('change', handleImageChange);
  addSectionButton.addEventListener('click', () => addSection(''));
  addButtonButton.addEventListener('click', () => addButton('', ''));
  newMessageButton.addEventListener('click', () => {
    resetComposer();
    setActiveTab('messages');
  });
  saveMessageButton.addEventListener('click', handleSaveMessage);
  sectionsContainer.addEventListener('input', updatePreview);
  buttonsContainer.addEventListener('input', updatePreview);
}

async function handleLogin(event) {
  if (event.submitter === basicLoginButton) {
    passwordInput.value = passwordInput.value.trim();
    return;
  }

  event.preventDefault();
  loginError.textContent = '';
  loginButton.disabled = true;
  basicLoginButton.disabled = true;
  loginButton.textContent = 'Checking API...';

  try {
    await api('/api/ping');
    loginButton.textContent = 'Logging in...';

    const loginResult = await api('/api/login', {
      method: 'POST',
      body: { password: passwordInput.value.trim() },
    });

    if (loginResult.sessionToken) {
      setSessionToken(loginResult.sessionToken);
    }

    const session = await api('/api/session').catch(() => loginResult);

    if (!session?.ok) {
      throw new Error('Password accepted, but the dashboard session could not be verified. Refresh and try again.');
    }

    showDashboard(session);
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    loginButton.disabled = false;
    basicLoginButton.disabled = false;
    loginButton.textContent = 'Log in';
  }
}

async function checkApiStatus() {
  setApiStatus(`Checking API on ${window.location.origin}...`, '');

  try {
    const health = await api('/health');
    const ping = await api('/api/ping');
    const botText = ping.botReady || health.botReady ? `Bot online${ping.tag ? `: ${ping.tag}` : ''}` : 'Bot not ready';

    setApiStatus(`API connected. ${botText}.`, 'success');
    dashboardApiStatus.textContent = 'Connected';
  } catch (error) {
    setApiStatus(`API check failed on ${window.location.origin}: ${error.message}`, 'error');
    dashboardApiStatus.textContent = 'Check failed';
  }
}

async function handleLogout() {
  await api('/api/logout', { method: 'POST', body: {} }).catch(() => null);
  clearSessionToken();
  showLogin();
}

async function handleSend(event) {
  event.preventDefault();
  setSendStatus('', '');
  sendButton.disabled = true;

  try {
    const payload = collectPayload();
    const result = await api('/api/send-message', {
      method: 'POST',
      body: payload,
    });

    const link = result.url ? ` Message: ${result.url}` : '';
    setSendStatus(`Sent to ${payload.channelId}.${link}`, 'success');
  } catch (error) {
    setSendStatus(error.message, 'error');
  } finally {
    sendButton.disabled = false;
  }
}

function showLogin() {
  dashboardView.hidden = true;
  loginView.hidden = false;
  document.body.classList.add('login-active');
  document.body.classList.remove('dashboard-active');

  if (new URLSearchParams(window.location.search).get('loginError') === 'invalid') {
    loginError.textContent = 'Invalid dashboard password.';
    window.history.replaceState({}, '', '/');
  }

  passwordInput.focus();
}

function showDashboard(session) {
  loginView.hidden = true;
  dashboardView.hidden = false;
  document.body.classList.remove('login-active');
  document.body.classList.add('dashboard-active');
  setBotStatus(Boolean(session?.botReady), session?.tag);
  setActiveTab(getActiveTab());
  renderSavedMessages();

  if (!state.composerInitialized) {
    resetComposer();
    state.composerInitialized = true;
  }
}

function setBotStatus(isReady, tag) {
  const text = isReady ? `Online${tag ? `: ${tag}` : ''}` : 'Bot not ready';

  botStatus.textContent = text;
  overviewBotStatus.textContent = text;
  botStatus.classList.toggle('ready', isReady);
  botStatus.classList.toggle('offline', !isReady);
}

function getActiveTab() {
  return tabButtons.find((button) => button.getAttribute('aria-selected') === 'true')?.dataset.tab || 'overview';
}

function setActiveTab(tab) {
  const nextTab = tabButtons.some((button) => button.dataset.tab === tab) ? tab : 'overview';

  for (const button of tabButtons) {
    button.setAttribute('aria-selected', String(button.dataset.tab === nextTab));
  }

  for (const panel of tabPanels) {
    panel.hidden = panel.dataset.panel !== nextTab;
  }
}

function handleSavedMessageClick(event) {
  const button = event.target.closest('.saved-message-chip');

  if (!button) {
    return;
  }

  loadSavedMessage(button.dataset.messageId);
}

function handleSaveMessage() {
  const payload = collectPayload();
  const savedMessage = {
    id: state.currentMessageId || createId(),
    name: payload.name || createUntitledMessageName(),
    channelId: payload.channelId,
    image: payload.image,
    sections: payload.sections,
    buttons: payload.buttons,
    allowMentions: payload.allowMentions,
    updatedAt: new Date().toISOString(),
  };
  const existingIndex = state.savedMessages.findIndex((message) => message.id === savedMessage.id);

  if (existingIndex >= 0) {
    state.savedMessages[existingIndex] = savedMessage;
  } else {
    state.savedMessages = [savedMessage, ...state.savedMessages];
  }

  if (!persistSavedMessages()) {
    return;
  }

  state.currentMessageId = savedMessage.id;
  messageNameInput.value = savedMessage.name;
  renderSavedMessages();
  setSendStatus(`Saved "${savedMessage.name}".`, 'success');
}

function loadSavedMessage(id) {
  const message = state.savedMessages.find((savedMessage) => savedMessage.id === id);

  if (!message) {
    return;
  }

  state.currentMessageId = message.id;
  applyMessage(message);
  renderSavedMessages();
  setActiveTab('messages');
  setSendStatus(`Loaded "${message.name}".`, 'success');
}

function resetComposer() {
  state.currentMessageId = null;
  applyMessage({
    name: '',
    channelId: '',
    image: null,
    sections: [],
    buttons: [],
    allowMentions: false,
  });
  renderSavedMessages();
  setSendStatus('', '');
}

function applyMessage(message) {
  messageNameInput.value = message.name || '';
  channelInput.value = message.channelId || '';
  allowMentionsInput.checked = Boolean(message.allowMentions);
  state.image = message.image || null;
  imageInput.value = '';
  sectionsContainer.innerHTML = '';
  buttonsContainer.innerHTML = '';

  for (const section of message.sections || []) {
    addSection(section);
  }

  for (const button of message.buttons || []) {
    addButton(button.label, button.url);
  }

  updatePreview();
}

function loadSavedMessages() {
  let messages = [];

  try {
    messages = JSON.parse(window.localStorage.getItem(savedMessagesStorageKey) || '[]');
  } catch {
    messages = [];
  }

  if (!Array.isArray(messages)) {
    messages = [];
  }

  state.savedMessages = messages.map(sanitizeSavedMessage).filter(Boolean);

  if (!state.savedMessages.some((message) => message.id === welcomeMessageId)) {
    state.savedMessages = [seededWelcomeMessage, ...state.savedMessages];
    persistSavedMessages();
  }
}

function persistSavedMessages() {
  try {
    window.localStorage.setItem(savedMessagesStorageKey, JSON.stringify(state.savedMessages));
    return true;
  } catch {
    setSendStatus('Could not save this message. Try removing the image or shortening the content.', 'error');
    return false;
  }
}

function sanitizeSavedMessage(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  return {
    id: String(message.id || createId()),
    name: String(message.name || 'Untitled message'),
    channelId: String(message.channelId || ''),
    image: message.image && typeof message.image === 'object' ? message.image : null,
    sections: Array.isArray(message.sections) ? message.sections.map((section) => String(section)) : [],
    buttons: Array.isArray(message.buttons)
      ? message.buttons.map((button) => ({
          label: String(button?.label || ''),
          url: String(button?.url || ''),
        }))
      : [],
    allowMentions: Boolean(message.allowMentions),
    updatedAt: String(message.updatedAt || new Date().toISOString()),
  };
}

function renderSavedMessages() {
  savedMessagesContainer.innerHTML = '';
  savedMessageCount.textContent = `${state.savedMessages.length} saved`;

  for (const message of state.savedMessages) {
    const button = document.createElement('button');
    const title = document.createElement('strong');
    const meta = document.createElement('span');

    button.className = 'saved-message-chip';
    button.classList.toggle('active', message.id === state.currentMessageId);
    button.type = 'button';
    button.dataset.messageId = message.id;
    title.textContent = message.name;
    meta.textContent = createSavedMessageMeta(message);
    button.append(title, meta);
    savedMessagesContainer.append(button);
  }
}

function createSavedMessageMeta(message) {
  const sectionCount = message.sections.filter((section) => section.trim()).length;
  const buttonCount = message.buttons.filter((button) => button.label.trim() && button.url.trim()).length;

  return `${sectionCount} text ${sectionCount === 1 ? 'section' : 'sections'} - ${buttonCount} ${buttonCount === 1 ? 'button' : 'buttons'}`;
}

function createUntitledMessageName() {
  return `Untitled Message ${state.savedMessages.length + 1}`;
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addSection(value) {
  const index = sectionsContainer.children.length + 1;
  const block = document.createElement('section');
  block.className = 'text-block';
  block.innerHTML = `
    <div class="block-header">
      <h2>Text ${index}</h2>
      <button class="secondary remove" type="button">Remove</button>
    </div>
    <textarea class="section-input" spellcheck="true"></textarea>
  `;

  block.querySelector('textarea').value = value;
  block.querySelector('.remove').addEventListener('click', () => {
    block.remove();
    updatePreview();
  });

  sectionsContainer.append(block);
  updatePreview();
}

function addButton(label, url) {
  const block = document.createElement('section');
  block.className = 'button-block';
  block.innerHTML = `
    <div class="block-header">
      <h2>Link Button</h2>
      <button class="secondary remove" type="button">Remove</button>
    </div>
    <div class="button-fields">
      <label class="field">
        Label
        <input class="button-label" maxlength="80" />
      </label>
      <label class="field">
        URL
        <input class="button-url" type="url" />
      </label>
    </div>
  `;

  block.querySelector('.button-label').value = label;
  block.querySelector('.button-url').value = url;
  block.querySelector('.remove').addEventListener('click', () => {
    block.remove();
    updatePreview();
  });

  buttonsContainer.append(block);
  updatePreview();
}

async function handleImageChange() {
  const file = imageInput.files[0];

  if (!file) {
    state.image = null;
    updatePreview();
    return;
  }

  if (!file.type.startsWith('image/')) {
    setSendStatus('Select an image file.', 'error');
    imageInput.value = '';
    return;
  }

  state.image = {
    name: file.name,
    dataUrl: await readFileAsDataUrl(file),
  };
  updatePreview();
}

function collectPayload() {
  return {
    name: messageNameInput.value.trim(),
    channelId: channelInput.value.trim(),
    image: state.image,
    sections: [...document.querySelectorAll('.section-input')].map((input) => input.value),
    buttons: [...document.querySelectorAll('.button-block')].map((block) => ({
      label: block.querySelector('.button-label').value,
      url: block.querySelector('.button-url').value,
    })),
    allowMentions: allowMentionsInput.checked,
  };
}

function updatePreview() {
  const payload = collectPayload();
  const sections = payload.sections.map((section) => section.trim()).filter(Boolean);
  const buttons = payload.buttons.filter((button) => button.label.trim() && button.url.trim());

  previewImage.hidden = !state.image;

  if (state.image) {
    previewImage.src = state.image.dataUrl;
  }

  previewSections.innerHTML = '';

  for (const section of sections) {
    const pre = document.createElement('pre');
    pre.className = 'preview-section';
    pre.textContent = section;
    previewSections.append(pre);
  }

  previewButtons.innerHTML = '';

  for (const button of buttons) {
    const anchor = document.createElement('a');
    anchor.className = 'preview-button';
    anchor.href = button.url;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = button.label;
    previewButtons.append(anchor);
  }

  sectionCount.textContent = `${sections.length} section${sections.length === 1 ? '' : 's'}`;
}

function setSendStatus(message, type) {
  sendStatus.textContent = message;
  sendStatus.classList.toggle('success', type === 'success');
  sendStatus.classList.toggle('error', type === 'error');
}

function setApiStatus(message, type) {
  apiStatus.textContent = message;
  apiStatus.classList.toggle('success', type === 'success');
  apiStatus.classList.toggle('error', type === 'error');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(new Error('Could not read image.')));
    reader.readAsDataURL(file);
  });
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const headers = {};
  const sessionToken = getSessionToken();

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  let response;

  try {
    response = await fetch(path, {
      method: options.method || 'GET',
      headers: Object.keys(headers).length ? headers : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The dashboard API did not respond. Check the Railway deployment logs.');
    }

    throw new Error('Could not reach the dashboard API. Refresh the page and check Railway logs.');
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 200) };
    }
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

function getSessionToken() {
  try {
    return window.localStorage.getItem(sessionStorageKey);
  } catch {
    return null;
  }
}

function setSessionToken(value) {
  try {
    window.localStorage.setItem(sessionStorageKey, value);
  } catch {
    // Cookies can still carry the session if local storage is unavailable.
  }
}

function clearSessionToken() {
  try {
    window.localStorage.removeItem(sessionStorageKey);
  } catch {
    // Ignore storage failures; logout still clears the server cookie.
  }
}

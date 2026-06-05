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
const refreshBotButton = document.querySelector('#refresh-bot');
const botProfileTag = document.querySelector('#bot-profile-tag');
const botProfileName = document.querySelector('#bot-profile-name');
const botProfileId = document.querySelector('#bot-profile-id');
const botAvatarPreview = document.querySelector('#bot-avatar-preview');
const botBannerPreview = document.querySelector('#bot-banner-preview');
const botBannerPlaceholder = document.querySelector('#bot-banner-placeholder');
const botAvatarInput = document.querySelector('#bot-avatar-file');
const botBannerInput = document.querySelector('#bot-banner-file');
const saveBotAvatarButton = document.querySelector('#save-bot-avatar');
const saveBotBannerButton = document.querySelector('#save-bot-banner');
const botPresenceForm = document.querySelector('#bot-presence-form');
const presenceStatusInput = document.querySelector('#presence-status');
const presenceActivityTypeInput = document.querySelector('#presence-activity-type');
const presenceActivityNameInput = document.querySelector('#presence-activity-name');
const presenceUrlField = document.querySelector('#presence-url-field');
const presenceActivityUrlInput = document.querySelector('#presence-activity-url');
const saveBotPresenceButton = document.querySelector('#save-bot-presence');
const composer = document.querySelector('#composer');
const messageNameInput = document.querySelector('#message-name');
const channelInput = document.querySelector('#channel-id');
const imageInput = document.querySelector('#image-file');
const allowMentionsInput = document.querySelector('#allow-mentions');
const sectionsContainer = document.querySelector('#sections');
const buttonsContainer = document.querySelector('#buttons');
const addSectionButton = document.querySelector('#add-section');
const addDividerButton = document.querySelector('#add-divider');
const addSpacerButton = document.querySelector('#add-spacer');
const addButtonButton = document.querySelector('#add-button');
const newMessageButton = document.querySelector('#new-message');
const saveMessageButton = document.querySelector('#save-message');
const sendButton = document.querySelector('#send');
const toastRegion = document.querySelector('#toast-region');
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
  botAvatarImage: null,
  botBannerImage: null,
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
  blocks: [{ type: 'text', content: welcomeStarter, accessory: null }],
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
  refreshBotButton.addEventListener('click', () => {
    refreshBotSettings(true).catch((error) => setSendStatus(error.message, 'error'));
  });
  botAvatarInput.addEventListener('change', () => handleBotImageChange('avatar'));
  botBannerInput.addEventListener('change', () => handleBotImageChange('banner'));
  saveBotAvatarButton.addEventListener('click', () => handleUpdateBotImage('avatar'));
  saveBotBannerButton.addEventListener('click', () => handleUpdateBotImage('banner'));
  botPresenceForm.addEventListener('submit', handleUpdateBotPresence);
  presenceActivityTypeInput.addEventListener('change', updatePresenceUrlVisibility);
  composer.addEventListener('submit', handleSend);
  savedMessagesContainer.addEventListener('click', handleSavedMessageClick);
  imageInput.addEventListener('change', handleImageChange);
  addSectionButton.addEventListener('click', () => addSection(''));
  addDividerButton.addEventListener('click', () => addDivider('small'));
  addSpacerButton.addEventListener('click', () => addSpacerBlock('small'));
  addButtonButton.addEventListener('click', () => addButton('', ''));
  newMessageButton.addEventListener('click', () => {
    resetComposer();
    setActiveTab('messages');
  });
  saveMessageButton.addEventListener('click', handleSaveMessage);
  sectionsContainer.addEventListener('input', updatePreview);
  sectionsContainer.addEventListener('change', updatePreview);
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

async function refreshBotSettings(showNotification = false) {
  const bot = await api('/api/bot');

  renderBotSettings(bot);

  if (showNotification) {
    setSendStatus('Bot profile refreshed.', 'success');
  }
}

function renderBotSettings(bot) {
  if (!bot?.ok) {
    return;
  }

  setBotStatus(Boolean(bot.botReady), bot.tag);
  botProfileTag.textContent = bot.tag || 'Bot not ready';
  botProfileName.textContent = bot.username || bot.tag || 'Relay';
  botProfileId.textContent = bot.id ? `ID ${bot.id}` : 'Waiting for Discord';

  if (bot.avatarUrl) {
    botAvatarPreview.src = bot.avatarUrl;
    botAvatarPreview.hidden = false;
  }

  if (bot.bannerUrl) {
    botBannerPreview.src = bot.bannerUrl;
    botBannerPreview.hidden = false;
    botBannerPlaceholder.hidden = true;
  } else {
    botBannerPreview.hidden = true;
    botBannerPreview.removeAttribute('src');
    botBannerPlaceholder.hidden = false;
  }

  const presence = bot.presence || {};
  presenceStatusInput.value = normalizePresenceStatus(presence.status);
  presenceActivityTypeInput.value = normalizeActivityType(presence.activityType);
  presenceActivityNameInput.value = presence.activityName || '';
  presenceActivityUrlInput.value = presence.activityUrl || '';
  updatePresenceUrlVisibility();
}

async function handleBotImageChange(kind) {
  const input = kind === 'avatar' ? botAvatarInput : botBannerInput;
  const file = input.files[0];

  if (!file) {
    if (kind === 'avatar') {
      state.botAvatarImage = null;
    } else {
      state.botBannerImage = null;
    }

    return;
  }

  if (!file.type.startsWith('image/')) {
    setSendStatus('Select an image file.', 'error');
    input.value = '';
    return;
  }

  const image = {
    name: file.name,
    dataUrl: await readFileAsDataUrl(file),
  };

  if (kind === 'avatar') {
    state.botAvatarImage = image;
    botAvatarPreview.src = image.dataUrl;
    botAvatarPreview.hidden = false;
  } else {
    state.botBannerImage = image;
    botBannerPreview.src = image.dataUrl;
    botBannerPreview.hidden = false;
    botBannerPlaceholder.hidden = true;
  }
}

async function handleUpdateBotImage(kind) {
  const isAvatar = kind === 'avatar';
  const image = isAvatar ? state.botAvatarImage : state.botBannerImage;
  const button = isAvatar ? saveBotAvatarButton : saveBotBannerButton;
  const input = isAvatar ? botAvatarInput : botBannerInput;

  if (!image) {
    setSendStatus(`Choose a bot ${kind} image first.`, 'error');
    return;
  }

  button.disabled = true;

  try {
    const bot = await api(`/api/bot/${kind}`, {
      method: 'POST',
      body: { image },
    });

    if (isAvatar) {
      state.botAvatarImage = null;
    } else {
      state.botBannerImage = null;
    }

    input.value = '';
    renderBotSettings(bot);
    setSendStatus(`Bot ${kind} updated.`, 'success');
  } catch (error) {
    setSendStatus(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function handleUpdateBotPresence(event) {
  event.preventDefault();
  saveBotPresenceButton.disabled = true;

  try {
    const bot = await api('/api/bot/presence', {
      method: 'POST',
      body: {
        status: presenceStatusInput.value,
        activityType: presenceActivityTypeInput.value,
        activityName: presenceActivityNameInput.value,
        activityUrl: presenceActivityUrlInput.value,
      },
    });

    renderBotSettings(bot);
    setSendStatus('Bot presence updated.', 'success');
  } catch (error) {
    setSendStatus(error.message, 'error');
  } finally {
    saveBotPresenceButton.disabled = false;
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
  refreshBotSettings().catch((error) => setSendStatus(error.message, 'error'));

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

  if (nextTab === 'bot' && !dashboardView.hidden) {
    refreshBotSettings().catch((error) => setSendStatus(error.message, 'error'));
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
    blocks: payload.blocks,
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
    blocks: [],
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

  for (const block of message.blocks || []) {
    if (block.type === 'text') {
      addSection(block.content, block.accessory);
      continue;
    }

    if (block.type === 'divider') {
      addDivider(block.spacing);
      continue;
    }

    if (block.type === 'spacer') {
      addSpacerBlock(block.spacing);
    }
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
    blocks: sanitizeBlocks(message),
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

function sanitizeBlocks(message) {
  const sourceBlocks = Array.isArray(message.blocks)
    ? message.blocks
    : (Array.isArray(message.sections) ? message.sections.map((section) => ({ type: 'text', content: section })) : []);

  return sourceBlocks
    .map((block) => {
      const type = String(block?.type || '').toLowerCase();

      if (type === 'text') {
        return {
          type,
          content: String(block.content || ''),
          accessory: sanitizeAccessory(block.accessory),
        };
      }

      if (type === 'divider' || type === 'spacer') {
        return {
          type,
          spacing: normalizeBlockSpacing(block.spacing),
        };
      }

      return null;
    })
    .filter(Boolean);
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
  const textCount = message.blocks.filter((block) => block.type === 'text' && block.content.trim()).length;
  const dividerCount = message.blocks.filter((block) => block.type === 'divider').length;
  const spacerCount = message.blocks.filter((block) => block.type === 'spacer').length;
  const accessoryCount = message.blocks.filter((block) => block.type === 'text' && block.accessory?.label && block.accessory?.url).length;
  const buttonCount = message.buttons.filter((button) => button.label.trim() && button.url.trim()).length;
  const totalButtonCount = accessoryCount + buttonCount;

  return `${textCount} text, ${dividerCount + spacerCount} layout, ${totalButtonCount} ${totalButtonCount === 1 ? 'button' : 'buttons'}`;
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

function addSection(value, accessory = null) {
  const index = sectionsContainer.querySelectorAll('.text-block').length + 1;
  const block = document.createElement('section');
  block.className = 'text-block content-block';
  block.dataset.blockType = 'text';
  block.innerHTML = `
    <div class="block-header">
      <h2>Text ${index}</h2>
      <div class="block-actions">
        <button class="secondary move-up" type="button">Up</button>
        <button class="secondary move-down" type="button">Down</button>
        <button class="secondary remove" type="button">Remove</button>
      </div>
    </div>
    <textarea class="section-input" spellcheck="true"></textarea>
    <label class="toggle-row">
      <input class="accessory-enabled" type="checkbox" />
      <span>Accessory button</span>
    </label>
    <div class="button-fields accessory-fields" hidden>
      <label class="field">
        Label
        <input class="accessory-label" maxlength="80" />
      </label>
      <label class="field">
        URL
        <input class="accessory-url" type="url" />
      </label>
    </div>
  `;

  block.querySelector('textarea').value = value;
  block.querySelector('.accessory-enabled').checked = Boolean(accessory);
  block.querySelector('.accessory-label').value = accessory?.label || '';
  block.querySelector('.accessory-url').value = accessory?.url || '';
  updateAccessoryFields(block);
  block.querySelector('.accessory-enabled').addEventListener('change', () => {
    updateAccessoryFields(block);
    updatePreview();
  });
  block.querySelector('.move-up').addEventListener('click', () => moveBlock(block, -1));
  block.querySelector('.move-down').addEventListener('click', () => moveBlock(block, 1));
  block.querySelector('.remove').addEventListener('click', () => {
    block.remove();
    updatePreview();
  });

  sectionsContainer.append(block);
  updatePreview();
}

function addDivider(spacing) {
  addLayoutBlock('divider', spacing);
}

function addSpacerBlock(spacing) {
  addLayoutBlock('spacer', spacing);
}

function addLayoutBlock(type, spacing) {
  const block = document.createElement('section');
  const isDivider = type === 'divider';

  block.className = 'layout-block content-block';
  block.dataset.blockType = type;
  block.innerHTML = `
    <div class="block-header">
      <h2>${isDivider ? 'Divider' : 'Spacer'}</h2>
      <div class="block-actions">
        <button class="secondary move-up" type="button">Up</button>
        <button class="secondary move-down" type="button">Down</button>
        <button class="secondary remove" type="button">Remove</button>
      </div>
    </div>
    <label class="field">
      Spacing
      <select class="block-spacing">
        <option value="small">Small</option>
        <option value="large">Large</option>
      </select>
    </label>
  `;

  block.querySelector('.block-spacing').value = normalizeBlockSpacing(spacing);
  block.querySelector('.move-up').addEventListener('click', () => moveBlock(block, -1));
  block.querySelector('.move-down').addEventListener('click', () => moveBlock(block, 1));
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
    blocks: collectBlocks(),
    buttons: [...document.querySelectorAll('.button-block')].map((block) => ({
      label: block.querySelector('.button-label').value,
      url: block.querySelector('.button-url').value,
    })),
    allowMentions: allowMentionsInput.checked,
  };
}

function collectBlocks() {
  return [...document.querySelectorAll('.content-block')]
    .map((block) => {
      const type = block.dataset.blockType;

      if (type === 'text') {
        return {
          type,
          content: block.querySelector('.section-input').value,
          accessory: collectAccessory(block),
        };
      }

      if (type === 'divider' || type === 'spacer') {
        return {
          type,
          spacing: normalizeBlockSpacing(block.querySelector('.block-spacing')?.value),
        };
      }

      return null;
    })
    .filter(Boolean);
}

function updatePreview() {
  const payload = collectPayload();
  const blocks = payload.blocks.filter((block) => {
    if (block.type !== 'text') {
      return true;
    }

    return block.content.trim();
  });
  const buttons = payload.buttons.filter((button) => button.label.trim() && button.url.trim());

  previewImage.hidden = !state.image;

  if (state.image) {
    previewImage.src = state.image.dataUrl;
  }

  previewSections.innerHTML = '';

  for (const block of blocks) {
    if (block.type === 'text') {
      previewSections.append(createTextPreviewBlock(block));
      continue;
    }

    const divider = document.createElement('div');
    divider.className = `preview-layout preview-layout-${block.type} preview-layout-${block.spacing}`;
    divider.setAttribute('aria-hidden', 'true');
    previewSections.append(divider);
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

  sectionCount.textContent = `${blocks.length} block${blocks.length === 1 ? '' : 's'}`;
}

function setSendStatus(message, type) {
  if (!message) {
    return;
  }

  showToast(message, type);
}

function showToast(message, type = '') {
  const toast = document.createElement('section');
  const close = document.createElement('button');

  toast.className = `toast ${type === 'error' ? 'error' : 'success'}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  close.className = 'toast-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = 'Close';
  close.addEventListener('click', () => dismissToast(toast));
  toast.append(close);
  toastRegion.append(toast);

  window.setTimeout(() => dismissToast(toast), type === 'error' ? 7000 : 4500);
}

function dismissToast(toast) {
  if (!toast.isConnected || toast.classList.contains('is-hiding')) {
    return;
  }

  toast.classList.add('is-hiding');
  window.setTimeout(() => toast.remove(), 220);
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

function normalizePresenceStatus(value) {
  const status = String(value || '').toLowerCase();

  return ['online', 'idle', 'dnd', 'invisible'].includes(status) ? status : 'online';
}

function normalizeActivityType(value) {
  const activityType = String(value || '').toLowerCase();
  const match = ['Watching', 'Playing', 'Listening', 'Competing', 'Streaming'].find(
    (type) => type.toLowerCase() === activityType,
  );

  return match || 'Watching';
}

function updatePresenceUrlVisibility() {
  const isStreaming = presenceActivityTypeInput.value === 'Streaming';

  presenceUrlField.hidden = !isStreaming;
  presenceActivityUrlInput.disabled = !isStreaming;
}

function normalizeBlockSpacing(spacing) {
  return String(spacing || '').toLowerCase() === 'large' ? 'large' : 'small';
}

function sanitizeAccessory(accessory) {
  if (!accessory || typeof accessory !== 'object') {
    return null;
  }

  const label = String(accessory.label || '');
  const url = String(accessory.url || '');

  return label || url ? { label, url } : null;
}

function collectAccessory(block) {
  if (!block.querySelector('.accessory-enabled')?.checked) {
    return null;
  }

  return {
    label: block.querySelector('.accessory-label').value,
    url: block.querySelector('.accessory-url').value,
  };
}

function updateAccessoryFields(block) {
  block.querySelector('.accessory-fields').hidden = !block.querySelector('.accessory-enabled').checked;
}

function moveBlock(block, direction) {
  if (direction < 0 && block.previousElementSibling) {
    sectionsContainer.insertBefore(block, block.previousElementSibling);
  }

  if (direction > 0 && block.nextElementSibling) {
    sectionsContainer.insertBefore(block.nextElementSibling, block);
  }

  updatePreview();
}

function createTextPreviewBlock(block) {
  const accessory = block.accessory?.label?.trim() && block.accessory?.url?.trim() ? block.accessory : null;

  if (!accessory) {
    const pre = document.createElement('pre');
    pre.className = 'preview-section';
    pre.textContent = block.content.trim();
    return pre;
  }

  const wrapper = document.createElement('div');
  const pre = document.createElement('pre');
  const button = document.createElement('a');

  wrapper.className = 'preview-section-with-accessory';
  pre.className = 'preview-section';
  pre.textContent = block.content.trim();
  button.className = 'preview-button preview-accessory-button';
  button.href = accessory.url;
  button.target = '_blank';
  button.rel = 'noreferrer';
  button.textContent = accessory.label;
  wrapper.append(pre, button);

  return wrapper;
}

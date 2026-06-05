const loginView = document.querySelector('#login-view');
const dashboardView = document.querySelector('#dashboard-view');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const passwordInput = document.querySelector('#password');
const logoutButton = document.querySelector('#logout');
const botStatus = document.querySelector('#bot-status');
const composer = document.querySelector('#composer');
const channelInput = document.querySelector('#channel-id');
const imageInput = document.querySelector('#image-file');
const allowMentionsInput = document.querySelector('#allow-mentions');
const sectionsContainer = document.querySelector('#sections');
const buttonsContainer = document.querySelector('#buttons');
const addSectionButton = document.querySelector('#add-section');
const addButtonButton = document.querySelector('#add-button');
const sendButton = document.querySelector('#send');
const sendStatus = document.querySelector('#send-status');
const previewImage = document.querySelector('#preview-image');
const previewSections = document.querySelector('#preview-sections');
const previewButtons = document.querySelector('#preview-buttons');
const sectionCount = document.querySelector('#section-count');

const state = {
  image: null,
};

const welcomeStarter = `# WELCOME TO INTERFACE SOCIETY
> We're a design-focused community for people who care about good visuals, thoughtful work, and creative culture.
> Share your work, ask for feedback, find inspiration, and connect with other creatives.

# EXTRA INFORMATION
> <a:ifs_calendar:1512493763791032502> **Created:** <t:1741958340:D>
> <a:ifs_link:1512494294068629575> **Invite:** https://discord.gg/CVWJFXWMS6`;

init();

async function init() {
  bindEvents();

  const session = await api('/api/session').catch(() => null);

  if (session?.ok) {
    showDashboard(session);
  } else {
    showLogin();
  }
}

function bindEvents() {
  loginForm.addEventListener('submit', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  composer.addEventListener('submit', handleSend);
  imageInput.addEventListener('change', handleImageChange);
  addSectionButton.addEventListener('click', () => addSection(''));
  addButtonButton.addEventListener('click', () => addButton('', ''));
  sectionsContainer.addEventListener('input', updatePreview);
  buttonsContainer.addEventListener('input', updatePreview);
}

async function handleLogin(event) {
  event.preventDefault();
  loginError.textContent = '';

  try {
    const result = await api('/api/login', {
      method: 'POST',
      body: { password: passwordInput.value },
    });
    showDashboard(result);
  } catch (error) {
    loginError.textContent = error.message;
  }
}

async function handleLogout() {
  await api('/api/logout', { method: 'POST', body: {} }).catch(() => null);
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
  passwordInput.focus();
}

function showDashboard(session) {
  loginView.hidden = true;
  dashboardView.hidden = false;
  setBotStatus(Boolean(session?.botReady), session?.tag);

  if (sectionsContainer.children.length === 0) {
    addSection(welcomeStarter);
    addButton('Guidelines', 'https://discord.com/channels/1350095949896093761/1350104592058159115');
    addButton('Introduce yourself', 'https://discord.com/channels/1350095949896093761/1511820790759166167');
  }
}

function setBotStatus(isReady, tag) {
  botStatus.textContent = isReady ? `Online${tag ? `: ${tag}` : ''}` : 'Bot not ready';
  botStatus.classList.toggle('ready', isReady);
  botStatus.classList.toggle('offline', !isReady);
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(new Error('Could not read image.')));
    reader.readAsDataURL(file);
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

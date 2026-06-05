const { ContainerBuilder, SeparatorSpacingSize } = require('./components');

const imageMimeExtensions = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function createDashboardMessagePayload(input, config) {
  const files = [];
  const component = new ContainerBuilder();
  const sections = normalizeSections(input.sections);
  const buttons = normalizeButtons(input.buttons);
  const image = normalizeImage(input.image, config);

  if (image) {
    files.push({
      attachment: image.buffer,
      name: image.fileName,
    });

    component.addMediaGalleryComponents((gallery) =>
      gallery.addItems((mediaGalleryItem) => mediaGalleryItem.setURL(`attachment://${image.fileName}`)),
    );
    addSpacer(component);
  }

  for (const [index, section] of sections.entries()) {
    if (index > 0) {
      addSpacer(component);
    }

    component.addTextDisplayComponents((textDisplay) => textDisplay.setContent(section));
  }

  if (buttons.length > 0) {
    addSpacer(component);
    component.addActionRowComponents((actionRow) =>
      actionRow.addComponents(
        ...buttons.map((button) => (builder) => builder.setLabel(button.label).setURL(button.url)),
      ),
    );
  }

  const payload = component.toDiscordPayload(files);

  if (!input.allowMentions) {
    payload.allowedMentions = { parse: [] };
  }

  return payload;
}

function addSpacer(component) {
  component.addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small));
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) {
    throw new Error('Sections must be an array.');
  }

  const normalized = sections
    .map((section) => String(section || '').trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new Error('Add at least one text section.');
  }

  if (normalized.length > 8) {
    throw new Error('Use 8 text sections or fewer.');
  }

  for (const section of normalized) {
    if (section.length > 4000) {
      throw new Error('Each text section must be 4000 characters or fewer.');
    }
  }

  return normalized;
}

function normalizeButtons(buttons) {
  if (!Array.isArray(buttons)) {
    return [];
  }

  const normalized = buttons
    .map((button) => ({
      label: String(button?.label || '').trim(),
      url: String(button?.url || '').trim(),
    }))
    .filter((button) => button.label || button.url);

  if (normalized.length > 5) {
    throw new Error('Use 5 buttons or fewer.');
  }

  for (const button of normalized) {
    if (!button.label || !button.url) {
      throw new Error('Every button needs a label and URL.');
    }

    if (button.label.length > 80) {
      throw new Error('Button labels must be 80 characters or fewer.');
    }

    assertHttpUrl(button.url, 'Button URL');
  }

  return normalized;
}

function normalizeImage(image, config) {
  if (!image?.dataUrl) {
    return null;
  }

  const match = String(image.dataUrl).match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error('Image upload must be a valid data URL.');
  }

  const mimeType = match[1];
  const extension = imageMimeExtensions[mimeType];

  if (!extension) {
    throw new Error('Image must be PNG, JPG, GIF, or WebP.');
  }

  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length > config.dashboard.maxUploadBytes) {
    throw new Error(`Image must be ${Math.floor(config.dashboard.maxUploadBytes / 1024 / 1024)} MB or smaller.`);
  }

  return {
    buffer,
    fileName: sanitizeFileName(image.name, extension),
  };
}

function sanitizeFileName(name, extension) {
  const baseName = String(name || `dashboard-upload.${extension}`)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);

  if (!baseName) {
    return `dashboard-upload.${extension}`;
  }

  if (baseName.toLowerCase().endsWith(`.${extension}`)) {
    return baseName;
  }

  return `${baseName}.${extension}`;
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

module.exports = {
  createDashboardMessagePayload,
};

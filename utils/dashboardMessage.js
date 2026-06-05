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
  const blocks = normalizeBlocks(input.blocks, input.sections);
  const buttons = normalizeButtons(input.buttons);
  const image = normalizeImage(input.image, config);

  if (!image && blocks.length === 0 && buttons.length === 0) {
    throw new Error('Add at least one text block, divider, spacer, image, or button.');
  }

  if (image) {
    files.push({
      attachment: image.buffer,
      name: image.fileName,
    });

    component.addMediaGalleryComponents((gallery) =>
      gallery.addItems((mediaGalleryItem) => mediaGalleryItem.setURL(`attachment://${image.fileName}`)),
    );

    if (blocks.length > 0 || buttons.length > 0) {
      addSpacer(component);
    }
  }

  for (const block of blocks) {
    if (block.type === 'text') {
      if (block.accessory) {
        component.addSectionComponents((section) =>
          section
            .addTextDisplayComponents((textDisplay) => textDisplay.setContent(block.content))
            .setButtonAccessory((button) => button.setLabel(block.accessory.label).setURL(block.accessory.url)),
        );
      } else {
        component.addTextDisplayComponents((textDisplay) => textDisplay.setContent(block.content));
      }

      continue;
    }

    component.addSeparatorComponents((separator) =>
      separator.setDivider(block.type === 'divider').setSpacing(block.spacing),
    );
  }

  if (buttons.length > 0) {
    if (blocks.length > 0 || image) {
      addSpacer(component);
    }

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

function normalizeBlocks(blocks, sections) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return normalizeLegacySections(sections);
  }

  const normalized = [];

  for (const block of blocks) {
    const type = String(block?.type || '').trim().toLowerCase();

    if (type === 'text') {
      const content = String(block?.content || '').trim();

      if (!content) {
        continue;
      }

      if (content.length > 4000) {
        throw new Error('Each text block must be 4000 characters or fewer.');
      }

      normalized.push({ type: 'text', content });
      normalized[normalized.length - 1].accessory = normalizeAccessory(block?.accessory);
      continue;
    }

    if (type === 'divider' || type === 'spacer') {
      normalized.push({
        type,
        spacing: normalizeSpacing(block?.spacing),
      });
    }
  }

  if (normalized.length > 24) {
    throw new Error('Use 24 content blocks or fewer.');
  }

  return normalized;
}

function normalizeLegacySections(sections) {
  if (!Array.isArray(sections)) {
    return [];
  }

  const normalized = sections
    .map((section) => String(section || '').trim())
    .filter(Boolean);

  if (normalized.length > 8) {
    throw new Error('Use 8 text sections or fewer.');
  }

  for (const section of normalized) {
    if (section.length > 4000) {
      throw new Error('Each text section must be 4000 characters or fewer.');
    }
  }

  return normalized.flatMap((section, index) => {
    if (index === 0) {
      return [{ type: 'text', content: section }];
    }

    return [
      { type: 'spacer', spacing: SeparatorSpacingSize.Small },
      { type: 'text', content: section },
    ];
  });
}

function normalizeSpacing(spacing) {
  return String(spacing || '').toLowerCase() === 'large'
    ? SeparatorSpacingSize.Large
    : SeparatorSpacingSize.Small;
}

function normalizeAccessory(accessory) {
  if (!accessory || typeof accessory !== 'object') {
    return null;
  }

  const label = String(accessory.label || '').trim();
  const url = String(accessory.url || '').trim();

  if (!label && !url) {
    return null;
  }

  if (!label || !url) {
    throw new Error('Accessory buttons need both a label and URL.');
  }

  if (label.length > 80) {
    throw new Error('Accessory button labels must be 80 characters or fewer.');
  }

  assertHttpUrl(url, 'Accessory button URL');

  return { label, url };
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

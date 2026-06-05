const SeparatorSpacingSize = {
  Small: 1,
  Large: 2,
};

class MediaGalleryItemBuilder {
  constructor() {
    this.data = {};
  }

  setURL(url) {
    this.data.url = url;
    return this;
  }

  build() {
    return {
      media: {
        url: this.data.url,
      },
    };
  }
}

class MediaGalleryBuilder {
  constructor() {
    this.items = [];
  }

  addItems(...callbacks) {
    for (const callback of callbacks) {
      const item = new MediaGalleryItemBuilder();
      callback(item);
      this.items.push(item.build());
    }

    return this;
  }

  build() {
    return {
      type: 12,
      items: this.items,
    };
  }
}

class SeparatorBuilder {
  constructor() {
    this.data = {
      divider: true,
      spacing: SeparatorSpacingSize.Small,
    };
  }

  setDivider(divider) {
    this.data.divider = divider;
    return this;
  }

  setSpacing(spacing) {
    this.data.spacing = spacing;
    return this;
  }

  build() {
    return {
      type: 14,
      divider: this.data.divider,
      spacing: this.data.spacing,
    };
  }
}

class TextDisplayBuilder {
  constructor() {
    this.data = {};
  }

  setContent(content) {
    this.data.content = content;
    return this;
  }

  build() {
    return {
      type: 10,
      content: this.data.content,
    };
  }
}

class SectionBuilder {
  constructor() {
    this.components = [];
    this.accessory = null;
  }

  addTextDisplayComponents(...callbacks) {
    for (const callback of callbacks) {
      const textDisplay = new TextDisplayBuilder();
      callback(textDisplay);
      this.components.push(textDisplay.build());
    }

    return this;
  }

  setButtonAccessory(callback) {
    const button = new ButtonBuilder();
    callback(button);
    this.accessory = button.build();
    return this;
  }

  build() {
    return {
      type: 9,
      components: this.components,
      accessory: this.accessory,
    };
  }
}

class ButtonBuilder {
  constructor() {
    this.data = {
      type: 2,
      style: 1,
    };
  }

  setStyle(style) {
    this.data.style = style;
    return this;
  }

  setLabel(label) {
    this.data.label = label;
    return this;
  }

  setURL(url) {
    this.data.url = url;
    this.data.style = 5;
    return this;
  }

  setCustomId(customId) {
    this.data.custom_id = customId;
    return this;
  }

  build() {
    return this.data;
  }
}

class ActionRowBuilder {
  constructor() {
    this.components = [];
  }

  addComponents(...callbacks) {
    for (const callback of callbacks) {
      const button = new ButtonBuilder();
      callback(button);
      this.components.push(button.build());
    }

    return this;
  }

  build() {
    return {
      type: 1,
      components: this.components,
    };
  }
}

class ContainerBuilder {
  constructor() {
    this.components = [];
  }

  addMediaGalleryComponents(callback) {
    const gallery = new MediaGalleryBuilder();
    callback(gallery);
    this.components.push(gallery.build());
    return this;
  }

  addSeparatorComponents(callback) {
    const separator = new SeparatorBuilder();
    callback(separator);
    this.components.push(separator.build());
    return this;
  }

  addTextDisplayComponents(callback) {
    const textDisplay = new TextDisplayBuilder();
    callback(textDisplay);
    this.components.push(textDisplay.build());
    return this;
  }

  addSectionComponents(callback) {
    const section = new SectionBuilder();
    callback(section);
    this.components.push(section.build());
    return this;
  }

  addActionRowComponents(callback) {
    const actionRow = new ActionRowBuilder();
    callback(actionRow);
    this.components.push(actionRow.build());
    return this;
  }

  build() {
    return {
      flags: 32768,
      components: [
        {
          type: 17,
          components: this.components,
        },
      ],
    };
  }

  toDiscordPayload(files = []) {
    return {
      ...this.build(),
      files,
    };
  }
}

module.exports = {
  ContainerBuilder,
  SeparatorSpacingSize,
};

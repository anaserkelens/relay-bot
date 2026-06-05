const path = require('node:path');

const { ContainerBuilder, SeparatorSpacingSize } = require('./components');
const { config } = require('./config');

const welcomeHeaderImageName = 'IFS_Welcome_Header.png';
const welcomeHeaderImagePath = path.join(__dirname, '..', 'images', welcomeHeaderImageName);

function createWelcomeMessagePayload(imagePath) {
  const container = new ContainerBuilder()
    .addMediaGalleryComponents((gallery) =>
      gallery.addItems((mediaGalleryItem) =>
        mediaGalleryItem.setURL(`attachment://${welcomeHeaderImageName}`),
      ),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`# WELCOME TO INTERFACE SOCIETY
> We're a design-focused community for people who care about good visuals, thoughtful work, and creative culture. Whether you're into UI/UX, graphic design, photography, car content, game captures, or just enjoy making things look better, you'll fit right in.
> Share your work, ask for feedback, find inspiration, and connect with other creatives.

# GOT QUESTIONS?
> Reach out to anyone with the <@&1350102611457736775> role if you need help. Someone from the team will get back to you as soon as possible.

# EXTRA INFORMATION
> <a:ifs_calendar:1512493763791032502> **Created:** <t:1741958340:D>
> <a:ifs_link:1512494294068629575> **Invite:** https://discord.gg/CVWJFXWMS6
`),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# GET STARTED'))
    .addActionRowComponents((actionRow) =>
      actionRow.addComponents(
        (button) =>
          button
            .setLabel('Guidelines')
            .setURL(`https://discord.com/channels/${config.guildId}/${config.channels.guidelines}`),
        (button) =>
          button
            .setLabel('Introduce yourself')
            .setURL(`https://discord.com/channels/${config.guildId}/${config.channels.introductions}`),
      ),
    );

  return container.toDiscordPayload([{ attachment: imagePath, name: welcomeHeaderImageName }]);
}

module.exports = {
  createWelcomeMessagePayload,
  welcomeHeaderImageName,
  welcomeHeaderImagePath,
};

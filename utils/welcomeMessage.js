import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
} from 'discord.js';
import { fileURLToPath } from 'node:url';

export const welcomeHeaderImageName = 'IFS_Welcome_Header.png';
export const welcomeHeaderImagePath = fileURLToPath(new URL(`../images/${welcomeHeaderImageName}`, import.meta.url));

export function createWelcomeMessagePayload(imagePath) {
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
> <a:DotLoader1:1512457794790625280> **Created:** <t:1741958340:D>
> <a:DotLoader1:1512457794790625280> **Invite:** https://discord.gg/CVWJFXWMS6
`),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# GET STARTED'))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Guidelines')
          .setURL('https://discord.com/channels/1350095949896093761/1350104592058159115'),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Introduce yourself')
          .setURL('https://discord.com/channels/1350095949896093761/1511820790759166167'),
      ),
    );

  return {
    components: [container],
    files: [new AttachmentBuilder(imagePath, { name: welcomeHeaderImageName })],
    flags: MessageFlags.IsComponentsV2,
  };
}

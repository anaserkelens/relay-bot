const { ActivityType, EmbedBuilder, Events } = require('discord.js');

const { config } = require('../utils/config');

const announcedStreams = new Set();

module.exports = {
  name: Events.PresenceUpdate,
  async execute(oldPresence, newPresence, client) {
    if (!config.streamMonitor.enabled || !newPresence?.member) {
      return;
    }

    const streamingActivity = newPresence.activities.find((activity) => activity.type === ActivityType.Streaming);

    if (!streamingActivity) {
      const oldStreamingActivity = oldPresence?.activities.find((activity) => activity.type === ActivityType.Streaming);

      if (oldStreamingActivity?.url) {
        announcedStreams.delete(oldStreamingActivity.url);
      }

      if (config.roles.live && newPresence.member.roles.cache.has(config.roles.live)) {
        await newPresence.member.roles.remove(config.roles.live).catch(() => null);
      }

      return;
    }

    const streamUrl = streamingActivity.url;
    const streamTitle = streamingActivity.details || '';
    const gameName = streamingActivity.state || '';

    if (!streamUrl || !streamUrl.includes('twitch.tv')) {
      return;
    }

    if (config.streamMonitor.gameNameIncludes && !gameName.toLowerCase().includes(config.streamMonitor.gameNameIncludes.toLowerCase())) {
      return;
    }

    if (config.streamMonitor.titleKeyword && !streamTitle.toLowerCase().includes(config.streamMonitor.titleKeyword.toLowerCase())) {
      return;
    }

    if (config.roles.streamWhitelist && !newPresence.member.roles.cache.has(config.roles.streamWhitelist)) {
      return;
    }

    if (announcedStreams.has(streamUrl) || !config.channels.streamAnnouncements) {
      return;
    }

    announcedStreams.add(streamUrl);

    try {
      const channel = await client.channels.fetch(config.channels.streamAnnouncements);

      if (!channel?.isSendable()) {
        return;
      }

      const twitchUsername = streamUrl.split('/').pop();
      const streamPreviewUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${twitchUsername}-1920x1080.jpg`;

      const embed = new EmbedBuilder()
        .setDescription(`# **${newPresence.member} is now live!**\n\n-# ${streamTitle}\n\n-# [Watch Stream](${streamUrl})`)
        .setColor(0x2dd4bf)
        .setImage(streamPreviewUrl);

      await channel.send({ embeds: [embed] });

      if (config.roles.live && !newPresence.member.roles.cache.has(config.roles.live)) {
        await newPresence.member.roles.add(config.roles.live).catch(() => null);
      }
    } catch (error) {
      console.error('Error announcing stream:', error);
      announcedStreams.delete(streamUrl);
    }
  },
};

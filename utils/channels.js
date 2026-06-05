async function fetchSendableChannel(client, channelId) {
  if (!channelId) {
    return null;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || typeof channel.isSendable !== 'function' || !channel.isSendable()) {
    return null;
  }

  return channel;
}

async function sendLog(client, channelId, payload) {
  const channel = await fetchSendableChannel(client, channelId);

  if (!channel) {
    return false;
  }

  await channel.send(payload);
  return true;
}

module.exports = {
  fetchSendableChannel,
  sendLog,
};

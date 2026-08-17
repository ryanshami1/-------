require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, AttachmentBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.type !== ChannelType.GuildText) return;

  try {
    // Sanitize @everyone and @here by inserting a zero-width space after @
    const sanitizedContent = message.content
      .replace(/@everyone/g, '@\u200beveryone')
      .replace(/@here/g, '@\u200bhere');

    const authorName = message.member?.displayName || message.author.username;
    const authorAvatar = message.member?.displayAvatarURL({ dynamic: true, size: 512 }) 
      || message.author.displayAvatarURL({ dynamic: true, size: 512 });

    const files = message.attachments.map(
      (att) => new AttachmentBuilder(att.url, { name: att.name })
    );

    let footerLine = '';

    if (message.reference && message.reference.messageId) {
      try {
        const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
        const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${repliedMessage.id}`;
        
        footerLine = `\n\n-# Replying to: ${messageLink}`;
      } catch (err) {
        footerLine = `\n\n-# Replying to an unknown message`;
      }
    }

    const webhooks = await message.channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.owner?.id === client.user.id);

    if (!webhook) {
      webhook = await message.channel.createWebhook({
        name: 'Message Relay',
        avatar: client.user.displayAvatarURL(),
      });
    }

    // allowedMentions: { parse: [] } disables all ping parsing (@everyone, @here, roles, users)
    await webhook.send({
      content: `${sanitizedContent}${footerLine}`,
      username: authorName,
      avatarURL: authorAvatar,
      files: files,
      allowedMentions: { parse: [] },
    });

    await message.delete();

  } catch (error) {
    console.error('Error handling message:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);

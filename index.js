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
  // Ignore bot messages or non-text channels
  if (message.author.bot || message.channel.type !== ChannelType.GuildText) return;

  try {
    const originalContent = message.content;
    const authorName = message.member?.displayName || message.author.username;
    const authorAvatar = message.member?.displayAvatarURL({ dynamic: true, size: 512 }) 
      || message.author.displayAvatarURL({ dynamic: true, size: 512 });

    // Re-pack media files (videos, images) so Discord hosts them natively
    const files = message.attachments.map(
      (att) => new AttachmentBuilder(att.url, { name: att.name })
    );

    let footerLine = '';

    // If message is a reply, append small subtext with message link (no ping)
    if (message.reference && message.reference.messageId) {
      try {
        const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
        const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${repliedMessage.id}`;
        
        footerLine = `\n\n-# Replying to: ${messageLink}`;
      } catch (err) {
        footerLine = `\n\n-# Replying to an unknown message`;
      }
    }

    // 1. Fetch or automatically create the channel webhook managed by the bot
    const webhooks = await message.channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.owner?.id === client.user.id);

    if (!webhook) {
      webhook = await message.channel.createWebhook({
        name: 'Message Relay',
        avatar: client.user.displayAvatarURL(),
      });
    }

    // 2. Send via Webhook using the sender's display name and avatar
    await webhook.send({
      content: `${originalContent}${footerLine}`,
      username: authorName,
      avatarURL: authorAvatar,
      files: files,
      allowedMentions: { parse: [] },
    });

    // 3. Delete original message after webhook succeeds
    await message.delete();

  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Reads the token from your .env file locally or Railway's Environment Variables in production
client.login(process.env.DISCORD_TOKEN);

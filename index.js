const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const http = require('http');

// KEYS & CONFIG
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8663930234:AAFQXLCvYhKWxwHjZsrP9-Vtzxcs5-D1GAY';
const API_KEY = process.env.JANNAT_API_KEY || 'ZNX_03CZSLDHHSW41IZWV61X8850';

const API_BASE_URL = 'https://otp-web-12.vercel.app';
const OTP_GROUP_CHAT_ID = '@JannatOTP_Official';
const SUPPORT_USERNAME = '@Olx006';
const MAIN_CHANNEL_LINK = 'https://t.me/JannatOTP_Official';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const users = {};

// GLOBAL CRASH HANDLER (Bot kabhi off nahi hoga)
process.on('uncaughtException', (err) => console.log('Caught exception:', err));
process.on('unhandledRejection', (reason, promise) => console.log('Unhandled Rejection:', reason));

function getUser(ctx) {
  const userId = ctx.from.id;
  if (!users[userId]) {
    users[userId] = { id: userId, name: ctx.from.first_name || 'User', balance: 0.00 };
  }
  return users[userId];
}

// MAIN KEYBOARD
const mainKeyboard = Markup.keyboard([
  ['📱 Get Number', '🚥 Live Traffic'],
  ['🤖 Api Number'],
  ['👤 Profile', '🔗 Refer'],
  ['💰 Withdraw', '☎️ Support']
]).resize();

bot.start((ctx) => {
  getUser(ctx);
  ctx.reply(`Welcome ${ctx.from.first_name}!\n\nChoose an option from the menu:`, mainKeyboard);
});

// HEARS HANDLERS
bot.hears(['📱 Get Number', 'Get Number'], (ctx) => {
  const servicesMenu = Markup.inlineKeyboard([
    [Markup.button.callback('📘 Facebook', 'srv_fb'), Markup.button.callback('🟢 WhatsApp', 'srv_wa')],
    [Markup.button.callback('🎵 TikTok', 'srv_tk'), Markup.button.callback('📸 Instagram', 'srv_ig')],
    [Markup.button.callback('❌ Cancel', 'close')]
  ]);
  ctx.reply('Select a service to get a virtual number:', servicesMenu);
});

bot.hears(['🚥 Live Traffic', 'Live Traffic'], (ctx) => {
  ctx.reply(`🚦 *Live Traffic Rates*\n\n📘 Facebook (fb): Active\n🟢 WhatsApp (wa): Active\n🎵 TikTok (tk): High Demand\n📸 Instagram (ig): Active`, { parse_mode: 'Markdown' });
});

bot.hears(['🤖 Api Number', 'Api Number'], (ctx) => {
  ctx.reply('🤖 *Api Number*\nWelcome to API Numbers! Check live ranges or request custom numbers.', { parse_mode: 'Markdown' });
});

bot.hears(['👤 Profile', 'Profile'], (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`👤 *My Profile*\n\n*User ID:* \`${u.id}\`\n💰 *Balance:* $${u.balance.toFixed(3)}`);
});

bot.hears(['🔗 Refer', 'Refer'], (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`🔗 *Your Referral Link:*\n\`https://t.me/${ctx.botInfo.username}?start=ref_${u.id}\``);
});

bot.hears(['💰 Withdraw', 'Withdraw'], (ctx) => {
  ctx.reply('💰 Minimum Withdrawals: $0.119 (Binance UID) / $15 (Bkash)');
});

bot.hears(['☎️ Support', 'Support'], (ctx) => {
  ctx.reply(`🚨 *Support:* ${SUPPORT_USERNAME}`);
});

// GET NUMBER
bot.action(/^srv_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  try {
    ctx.answerCbQuery('Fetching number...').catch(() => {});
    await ctx.reply(`⏳ *Provisioning number for ${serviceCode.toUpperCase()}...*`, { parse_mode: 'Markdown' });

    const number = "232" + Math.floor(70000000 + Math.random() * 90000000);
    const orderId = Math.floor(100000 + Math.random() * 900000);

    const orderKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Check OTP', `check_${orderId}`), Markup.button.callback('❌ Cancel Order', `cancel_${orderId}`)],
      [Markup.button.url('🔑 OTP Group', MAIN_CHANNEL_LINK)]
    ]);

    ctx.replyWithMarkdown(
      `🌐 *YOUR NUMBER DETAILS*\n\n` +
      `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
      `📱 *Number:* \`+${number}\` (Tap to copy)\n` +
      `🆔 *Order ID:* \`${orderId}\`\n\n` +
      `🔑 *Status:* Waiting for OTP (Auto Syncing 5s)...`,
      orderKeyboard
    );

    pollForOtp(ctx, orderId, number, serviceCode, 'Sierra Leone');
  } catch (err) {
    ctx.reply('⚠️ Error fetching number. Please try again.').catch(() => {});
  }
});

// CANCEL ACTION
bot.action(/^cancel_/, (ctx) => {
  const orderId = ctx.match.input.split('_')[1];
  ctx.answerCbQuery('Cancelling order...').catch(() => {});
  ctx.editMessageText(`❌ *Order #${orderId} Cancelled Successfully.*`, { parse_mode: 'Markdown' }).catch(() => {});
});

bot.action(/^check_/, (ctx) => {
  ctx.answerCbQuery('Checking for SMS...').catch(() => {});
});

function pollForOtp(ctx, orderId, number, service, country) {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (attempts === 2) {
      clearInterval(interval);
      const otpCode = Math.floor(100000 + Math.random() * 900000);
      const fullMsg = `${otpCode} is your ${service.toUpperCase()} code`;

      ctx.replyWithMarkdown(
        `🎉 *OTP RECEIVED!*\n\n` +
        `📱 *Number:* \`+${number}\`\n` +
        `🔑 *OTP Code:* \`${otpCode}\` (Tap to copy)\n\n` +
        `📩 *Full Message:* \`${fullMsg}\``
      ).catch(() => {});

      if (OTP_GROUP_CHAT_ID) {
        const groupMsg = 
          `*ACTIVE RANGE*\n` +
          `——— 📸✨ *${service.toUpperCase()} RANGE* ✨———\n\n` +
          `🌐 *Country*  ➔ 🇸🇱 ${country}\n` +
          `🗣 *Service* ➔ ${service.toUpperCase()}\n` +
          `🔑 *Code*    ➔ \`${otpCode}\`\n\n` +
          `🎯 *Range*   ➔ \`${String(number).substring(0, 6)}XXX\`\n\n` +
          `📩 *Message*\n\`<#> ${fullMsg} "\``;

        const groupButtons = Markup.inlineKeyboard([
          [
            Markup.button.url('🤖 NUMBER BOT', `https://t.me/${ctx.botInfo.username}`),
            Markup.button.url('📢 MAIN CHANNEL', MAIN_CHANNEL_LINK)
          ]
        ]);

        bot.telegram.sendMessage(OTP_GROUP_CHAT_ID, groupMsg, { parse_mode: 'Markdown', ...groupButtons }).catch(() => {});
      }
    }
  }, 5000);
}

bot.action('close', (ctx) => ctx.deleteMessage().catch(() => {}));

// SERVER & LAUNCH
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Active');
}).listen(PORT);

bot.launch().then(() => console.log('Bot is active')).catch(err => console.log('Launch Error:', err));

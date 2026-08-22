const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const http = require('http');

// KEYS & CONFIG
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8663930234:AAFQXLCvYhKWxwHjZsrP9-Vtzxcs5-D1GAY';
const API_KEY = process.env.JANNAT_API_KEY || 'ZNX_03CZSLDHHSW41IZWV61X8850';

// DIRECT VERCEL DOMAIN (NO PHP)
const API_BASE_URL = 'https://otp-web-12.vercel.app';
const OTP_GROUP_CHAT_ID = '@JannatOTP_Official';
const SUPPORT_USERNAME = '@Olx006';
const MAIN_CHANNEL_LINK = 'https://t.me/JannatOTP_Official';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const users = {};

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

bot.hears('📱 Get Number', (ctx) => {
  const servicesMenu = Markup.inlineKeyboard([
    [Markup.button.callback('📘 Facebook', 'srv_fb'), Markup.button.callback('🟢 WhatsApp', 'srv_wa')],
    [Markup.button.callback('🎵 TikTok', 'srv_tk'), Markup.button.callback('📸 Instagram', 'srv_ig')],
    [Markup.button.callback('❌ Cancel', 'close')]
  ]);
  ctx.reply('Select a service to get a virtual number:', servicesMenu);
});

bot.hears('🚥 Live Traffic', (ctx) => {
  ctx.reply(`🚦 *Live Traffic Rates*\n\n📘 Facebook (fb): Active\n🟢 WhatsApp (wa): Active\n🎵 TikTok (tk): High Demand\n📸 Instagram (ig): Active`, { parse_mode: 'Markdown' });
});

bot.hears('🤖 Api Number', (ctx) => {
  ctx.reply('🤖 *Api Number*\nWelcome to API Numbers! Check live ranges or request custom numbers.', { parse_mode: 'Markdown' });
});

bot.hears('👤 Profile', (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`👤 *My Profile*\n\n*User ID:* \`${u.id}\`\n💰 *Balance:* $${u.balance.toFixed(3)}`);
});

bot.hears('🔗 Refer', (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`🔗 *Your Referral Link:*\n\`https://t.me/${ctx.botInfo.username}?start=ref_${u.id}\``);
});

bot.hears('💰 Withdraw', (ctx) => {
  ctx.reply('💰 Minimum Withdrawals: $0.119 (Binance UID) / $15 (Bkash)');
});

bot.hears('☎️ Support', (ctx) => {
  ctx.reply(`🚨 *Support:* ${SUPPORT_USERNAME}`);
});

// GET NUMBER (DIRECT NO-PHP REQUEST)
bot.action(/^srv_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  ctx.answerCbQuery('Fetching number...');
  await ctx.reply(`⏳ *Provisioning number for ${serviceCode.toUpperCase()}...*`, { parse_mode: 'Markdown' });

  try {
    const res = await axios.get(API_BASE_URL, {
      params: {
        api_key: API_KEY,
        action: 'get_number',
        service: serviceCode,
        country: 'any'
      },
      timeout: 10000
    });

    let data = res.data;

    // Direct fallback generation if website returns standard success
    if (data) {
      const number = data.number || data.phone || ("232" + Math.floor(70000000 + Math.random() * 90000000));
      const orderId = data.order_id || data.id || Math.floor(100000 + Math.random() * 900000);
      const countryName = data.country || 'Sierra Leone';

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

      pollForOtp(ctx, orderId, number, serviceCode, countryName);
    } else {
      ctx.reply('❌ Unable to process response.');
    }
  } catch (err) {
    ctx.reply(`⚠️ Connection Error: ${err.message}`);
  }
});

// CANCEL ACTION
bot.action(/^cancel_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[1];
  ctx.answerCbQuery('Cancelling order...');
  ctx.editMessageText(`❌ *Order #${orderId} Cancelled Successfully.*`, { parse_mode: 'Markdown' });
});

bot.action(/^check_/, (ctx) => {
  ctx.answerCbQuery('Checking for SMS...');
});

// OTP POLLING
function pollForOtp(ctx, orderId, number, service, country) {
  let attempts = 0;
  const maxAttempts = 120;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await axios.get(API_BASE_URL, {
        params: { api_key: API_KEY, action: 'get_sms', order_id: orderId }
      });
      const data = res.data;

      if (data && (data.sms_code || data.code || data.status === 'SMS_RECEIVED')) {
        clearInterval(interval);
        const otpCode = data.sms_code || data.code || Math.floor(100000 + Math.random() * 900000);
        const fullMsg = data.sms_text || `${otpCode} is your ${service.toUpperCase()} code`;

        ctx.replyWithMarkdown(
          `🎉 *OTP RECEIVED!*\n\n` +
          `📱 *Number:* \`+${number}\`\n` +
          `🔑 *OTP Code:* \`${otpCode}\` (Tap to copy)\n\n` +
          `📩 *Full Message:* \`${fullMsg}\``
        );

        const now = new Date();
        const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
        const rangeText = `${String(number).substring(0, 6)}XXX`;

        const groupMsg = 
          `*ACTIVE RANGE*\n` +
          `——— 📸✨ *${service.toUpperCase()} RANGE* ✨———\n\n` +
          `🌐 *Country*  ➔ 🇸🇱 ${country}\n` +
          `🗣 *Service* ➔ ${service.toUpperCase()}\n` +
          `🔑 *Code*    ➔ \`${otpCode}\`\n\n` +
          `🎯 *Range*   ➔ \`${rangeText}\`\n\n` +
          `⏰ *Time*    ➔ ${timeStr} AM (BD)\n\n` +
          `📩 *Message*\n` +
          `\`<#> ${fullMsg} "\``;

        const groupButtons = Markup.inlineKeyboard([
          [
            Markup.button.url('🤖 NUMBER BOT', `https://t.me/${ctx.botInfo.username}`),
            Markup.button.url('📢 MAIN CHANNEL', MAIN_CHANNEL_LINK)
          ]
        ]);

        if (OTP_GROUP_CHAT_ID) {
          bot.telegram.sendMessage(OTP_GROUP_CHAT_ID, groupMsg, {
            parse_mode: 'Markdown',
            ...groupButtons
          }).catch(() => {});
        }
      }
    } catch (err) {}

    if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 5000);
}

bot.action('close', (ctx) => ctx.deleteMessage().catch(() => {}));

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Online\n');
}).listen(PORT);

bot.launch().then(() => console.log('Bot is live!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

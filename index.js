const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const http = require('http');

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEY = process.env.JANNAT_API_KEY || 'ZNX_03CZSLDHHSW41IZWV61X8850';
const API_BASE_URL = process.env.API_BASE_URL || 'https://otp-web-12.vercel.app';

const OTP_GROUP_CHAT_ID = '@JannatOTP_Official';
const SUPPORT_USERNAME = '@Olx006';
const MAIN_CHANNEL_LINK = 'https://t.me/JannatOTP_Official';

if (!TELEGRAM_BOT_TOKEN) {
  console.error("FATAL ERROR: BOT_TOKEN is missing!");
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const users = {};

process.on('uncaughtException', (err) => console.log('Unhandled:', err));
process.on('unhandledRejection', (reason) => console.log('Rejection:', reason));

function getUser(ctx) {
  const userId = ctx.from.id;
  if (!users[userId]) {
    users[userId] = { id: userId, name: ctx.from.first_name || 'User', balance: 0.00 };
  }
  return users[userId];
}

const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*'
};

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

// TEXT MATCHING FIX
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();

  if (text.includes('Get Number')) {
    const servicesMenu = Markup.inlineKeyboard([
      [Markup.button.callback('📘 Facebook', 'srv_fb'), Markup.button.callback('🟢 WhatsApp', 'srv_wa')],
      [Markup.button.callback('🎵 TikTok', 'srv_tk'), Markup.button.callback('📸 Instagram', 'srv_ig')],
      [Markup.button.callback('❌ Cancel', 'close')]
    ]);
    return ctx.reply('Select a service to get a virtual number:', servicesMenu);
  }

  if (text.includes('Live Traffic')) {
    return ctx.reply(`🚦 *Live Traffic Rates*\n\n📘 Facebook (fb): Active\n🟢 WhatsApp (wa): Active\n🎵 TikTok (tk): High Demand\n📸 Instagram (ig): Active`, { parse_mode: 'Markdown' });
  }

  if (text.includes('Api Number')) {
    return ctx.reply('🤖 *Api Number*\nWelcome to API Numbers!', { parse_mode: 'Markdown' });
  }

  if (text.includes('Profile')) {
    const u = getUser(ctx);
    return ctx.replyWithMarkdown(`👤 *My Profile*\n\n*User ID:* \`${u.id}\`\n💰 *Balance:* $${u.balance.toFixed(3)}`);
  }

  if (text.includes('Refer')) {
    const u = getUser(ctx);
    return ctx.replyWithMarkdown(`🔗 *Your Referral Link:*\n\`https://t.me/${ctx.botInfo.username}?start=ref_${u.id}\``);
  }

  if (text.includes('Withdraw')) {
    return ctx.reply('💰 Minimum Withdrawals: $0.119 (Binance UID) / $15 (Bkash)');
  }

  if (text.includes('Support')) {
    return ctx.reply(`🚨 *Support:* ${SUPPORT_USERNAME}`);
  }
});

// ACTIONS HANDLER
bot.action(/^srv_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  try {
    ctx.answerCbQuery('Connecting to server...').catch(() => {});
    await ctx.reply(`⏳ *Requesting real number for ${serviceCode.toUpperCase()}...*`, { parse_mode: 'Markdown' });

    const res = await axios.get(`${API_BASE_URL}/get-number.php`, {
      params: { api_key: API_KEY, action: 'get_number', service: serviceCode },
      headers: requestHeaders,
      timeout: 15000
    });

    const data = res.data;

    if (data && data.success !== false && (data.number || data.phone)) {
      const number = data.number || data.phone;
      const orderId = data.order_id || data.id;
      const countryName = data.country || 'Global';

      const orderKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Check OTP', `check_${orderId}`), Markup.button.callback('❌ Cancel Order', `cancel_${orderId}`)],
        [Markup.button.url('🔑 OTP Group', MAIN_CHANNEL_LINK)]
      ]);

      ctx.replyWithMarkdown(
        `🌐 *REAL NUMBER DETAILS*\n\n` +
        `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
        `📱 *Number:* \`+${number}\` (Tap to copy)\n` +
        `🆔 *Order ID:* \`${orderId}\`\n\n` +
        `🔑 *Status:* Waiting for SMS from provider...`,
        orderKeyboard
      );

      pollForRealOtp(ctx, orderId, number, serviceCode, countryName);
    } else {
      const errMsg = (data && data.message) ? data.message : 'No active numbers/stock available from provider.';
      ctx.reply(`❌ *Provider Error:* ${errMsg}`);
    }
  } catch (err) {
    ctx.reply(`⚠️ *API Connection Failed:* ${err.response ? err.response.status : err.message}`);
  }
});

bot.action(/^cancel_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[1];
  ctx.answerCbQuery('Cancelling...').catch(() => {});
  try {
    await axios.get(`${API_BASE_URL}/get-number.php`, { 
      params: { api_key: API_KEY, action: 'cancel_number', order_id: orderId },
      headers: requestHeaders
    });
  } catch(e) {}
  ctx.editMessageText(`❌ *Order #${orderId} Cancelled.*`, { parse_mode: 'Markdown' }).catch(() => {});
});

bot.action(/^check_/, (ctx) => {
  ctx.answerCbQuery('Checking API for SMS...').catch(() => {});
});

function pollForRealOtp(ctx, orderId, number, service, country) {
  let attempts = 0;
  const maxAttempts = 30;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await axios.get(`${API_BASE_URL}/get-number.php`, {
        params: { api_key: API_KEY, action: 'get_sms', order_id: orderId },
        headers: requestHeaders
      });
      const data = res.data;

      if (data && data.success !== false && (data.sms_code || data.code || data.sms)) {
        clearInterval(interval);
        const otpCode = data.sms_code || data.code || data.sms;
        const fullMsg = data.sms_text || data.full_sms || `Your verification code is ${otpCode}`;

        ctx.replyWithMarkdown(
          `🎉 *REAL OTP RECEIVED!*\n\n` +
          `📱 *Number:* \`+${number}\`\n` +
          `🔑 *OTP Code:* \`${otpCode}\` (Tap to copy)\n\n` +
          `📩 *Full Message:* \`${fullMsg}\``
        ).catch(() => {});

        if (OTP_GROUP_CHAT_ID) {
          const groupMsg = 
            `*ACTIVE RANGE*\n` +
            `——— 📸✨ *${service.toUpperCase()} RANGE* ✨———\n\n` +
            `🌐 *Country*  ➔ ${country}\n` +
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
  res.end('Bot Active');
}).listen(PORT);

bot.launch().then(() => console.log('Bot Active')).catch(err => console.log('Launch Error:', err));

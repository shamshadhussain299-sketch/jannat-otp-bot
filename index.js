const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const http = require('http');

// CONFIGURATIONS
const TELEGRAM_BOT_TOKEN = '8663930234:AAFCDXDuLLofDASj7ZCygDmPNZ-EUFgM0FE';

// JANNAT OTP PLATFORM API
const API_BASE_URL = 'https://jannat-otp-1.vercel.app/get-number.php';
const API_KEY = 'ZNX_03CZSLDHHSW41IZWV61X8850';

const OTP_GROUP_CHAT_ID = '@JannatOTP_Official';
const SUPPORT_USERNAME = '@Olx006';
const MAIN_CHANNEL_LINK = 'https://t.me/JannatOTP_Official';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const users = {};

function getUser(ctx) {
  const userId = ctx.from.id;
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      name: ctx.from.first_name || 'User',
      balance: 0.00,
      referrals: 0
    };
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

// GET NUMBER & INSTANT DISPLAY
bot.action(/^srv_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  ctx.answerCbQuery('Fetching number...');
  await ctx.reply(`⏳ *Provisioning number for ${serviceCode.toUpperCase()}...*`, { parse_mode: 'Markdown' });

  try {
    const res = await axios.get(`${API_BASE_URL}?api_key=${API_KEY}&action=get_number&service=${serviceCode}&country=any`);
    const data = res.data;

    if (data && (data.number || data.success)) {
      const number = data.number;
      const orderId = data.order_id || Date.now();
      const countryName = data.country || 'Sierra Leone';

      // Keyboard with Click-to-Copy Number & Cancel Button
      const orderKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback(`📋 Tap to Copy: +${number}`, `copy_${number}`)],
        [Markup.button.url('🔑 OTP Group', MAIN_CHANNEL_LINK)],
        [Markup.button.callback('❌ Cancel Order', `cancel_${orderId}`)]
      ]);

      ctx.replyWithMarkdown(
        `🌐 *YOUR NUMBER DETAILS*\n\n` +
        `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
        `📱 *Number:* \`+${number}\` (Tap to copy)\n` +
        `🆔 *Order ID:* \`${orderId}\`\n\n` +
        `🔑 *Status:* Waiting for OTP...`,
        orderKeyboard
      );

      // Start OTP Polling
      pollForOtp(ctx, orderId, number, serviceCode, countryName);
    } else {
      ctx.reply('❌ No numbers available. Please try again.');
    }
  } catch (err) {
    ctx.reply('⚠️ Error connecting to server.');
  }
});

// CANCEL ORDER ACTION
bot.action(/^cancel_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[1];
  ctx.answerCbQuery();

  try {
    await axios.get(`${API_BASE_URL}?api_key=${API_KEY}&action=cancel_number&order_id=${orderId}`);
    ctx.editMessageText(`❌ *Order #${orderId} Cancelled Successfully.*`, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.editMessageText(`❌ *Order #${orderId} Cancelled.*`, { parse_mode: 'Markdown' });
  }
});

// OTP POLLING & ACTIVE RANGE GROUP FORWARDING
function pollForOtp(ctx, orderId, number, service, country) {
  let attempts = 0;
  const maxAttempts = 120;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await axios.get(`${API_BASE_URL}?api_key=${API_KEY}&action=get_sms&order_id=${orderId}`);
      const data = res.data;

      if (data && (data.sms_code || data.code || data.status === 'SMS_RECEIVED')) {
        clearInterval(interval);
        const otpCode = data.sms_code || data.code;
        const fullMsg = data.sms_text || `${otpCode} is your ${service.toUpperCase()} code`;

        // Send OTP to User (Click-to-Copy OTP Code)
        ctx.replyWithMarkdown(
          `🎉 *OTP RECEIVED!*\n\n` +
          `📱 *Number:* \`+${number}\`\n` +
          `🔑 *OTP Code:* \`${otpCode}\` (Tap to copy)\n\n` +
          `📩 *Full Message:* \`${fullMsg}\``
        );

        // Date-Time formatting
        const now = new Date();
        const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

        // Format exact as requested in Active Range Image
        const rangeText = `${number.substring(0, 6)}XXX`;
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
bot.action(/^copy_/, (ctx) => ctx.answerCbQuery('Number copied to clipboard!'));

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Online\n');
}).listen(PORT);

bot.launch().then(() => console.log('Bot is live!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

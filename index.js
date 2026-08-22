const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const http = require('http');

// CONFIGURATIONS
const TELEGRAM_BOT_TOKEN = '8663930234:AAFCDXDuLLofDASj7ZCygDmPNZ-EUFgM0FE';

// FIXED JANNAT OTP API CONFIG
const API_BASE_URL = 'https://jannat-otp-1.vercel.app/api/get-number.php';
const API_KEY = 'ZNX_03CZSLDHHSW41IZWV61X8850';

const OTP_GROUP_CHAT_ID = '@JannatOTP_Official';
const SUPPORT_USERNAME = '@Olx006';
const MAIN_CHANNEL_LINK = 'https://t.me/JannatOTP_Official';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const users = {};
const activePollers = {};

function getUser(ctx) {
  const userId = ctx.from.id;
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      name: ctx.from.first_name || 'User',
      joined: new Date().toISOString().replace('T', ' ').substring(0, 19),
      balance: 0.00,
      totalEarned: 0.00,
      refEarned: 0.00,
      otpEarned: 0.00,
      referralsCount: 0,
      referredBy: null
    };
  }
  return users[userId];
}

const mainReplyKeyboard = Markup.keyboard([
  ['📱 Get Number', '🚥 Live Traffic'],
  ['🤖 Api Number'],
  ['👤 Profile', '🔗 Refer'],
  ['💰 Withdraw', '☎️ Support']
]).resize();

bot.start((ctx) => {
  const user = getUser(ctx);
  const startPayload = ctx.startPayload;
  if (startPayload && startPayload.startsWith('ref_') && !user.referredBy) {
    const referrerId = startPayload.replace('ref_', '');
    if (referrerId != user.id && users[referrerId]) {
      user.referredBy = referrerId;
      users[referrerId].referralsCount += 1;
      try {
        ctx.telegram.sendMessage(referrerId, `🎉 *New Referral!* ${user.name} joined using your link!`, { parse_mode: 'Markdown' });
      } catch (e) {}
    }
  }

  ctx.reply(`Welcome ${user.name} to *Jannat OTP Platform*!\n\nUse the menu below to get started:`, {
    parse_mode: 'Markdown',
    ...mainReplyKeyboard
  });
});

bot.hears('📱 Get Number', (ctx) => {
  const servicesMenu = Markup.inlineKeyboard([
    [Markup.button.callback('📘 Facebook', 'service_fb'), Markup.button.callback('🟢 WhatsApp', 'service_wa')],
    [Markup.button.callback('🎵 TikTok', 'service_tk'), Markup.button.callback('📸 Instagram', 'service_ig')],
    [Markup.button.callback('❌ Cancel', 'close_menu')]
  ]);
  ctx.reply('Select a service to get a virtual number:', servicesMenu);
});

bot.hears('🚥 Live Traffic', (ctx) => {
  ctx.reply(`🚦 *Live Traffic Rates*\n\n📘 Facebook: Active\n🟢 WhatsApp: Active\n🎵 TikTok: High Demand\n📸 Instagram: Active`, { parse_mode: 'Markdown' });
});

bot.hears('🤖 Api Number', (ctx) => {
  ctx.reply('🤖 *Api Number*\nLive ranges active for Madagascar (+261), Guinea (+224), UK (+44), Tajikistan (+992), Armenia (+374).', { parse_mode: 'Markdown' });
});

bot.hears('👤 Profile', (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`👤 *Profile*\n*ID:* \`${u.id}\`\n*Name:* ${u.name}\n💰 *Balance:* Rs. ${u.balance.toFixed(2)}\n👥 *Referrals:* ${u.referralsCount}`);
});

bot.hears('🔗 Refer', (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`🔗 *Your Ref Link:*\n\`https://t.me/${ctx.botInfo.username}?start=ref_${u.id}\``);
});

bot.hears('💰 Withdraw', (ctx) => {
  ctx.reply('💰 Minimum Withdrawal: $0.119 (Binance) / Rs. 100 (EasyPaisa / JazzCash)');
});

bot.hears('☎️ Support', (ctx) => {
  ctx.reply(`🚨 *Support:* ${SUPPORT_USERNAME}\n📢 *Official Channel:* ${MAIN_CHANNEL_LINK}`);
});

// GET NUMBER API
bot.action(/^service_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  ctx.answerCbQuery();
  const loadingMsg = await ctx.reply(`⏳ *Provisioning number for ${serviceCode.toUpperCase()}...*`, { parse_mode: 'Markdown' });

  try {
    const requestUrl = `${API_BASE_URL}?api_key=${API_KEY}&action=get_number&service=${serviceCode}&country=any`;
    const response = await axios.get(requestUrl, { timeout: 15000 });
    const resData = response.data;

    if (resData && (resData.success || resData.number)) {
      const orderId = String(resData.order_id || resData.id || Date.now());
      const allocatedNum = resData.number || resData.phone;

      const cancelBtn = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Cancel Order', `cancel_${orderId}`)]
      ]);

      const sentMsg = await ctx.replyWithMarkdown(
        `🌐 *YOUR NUMBER DETAILS*\n\n` +
        `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
        `📱 *Number:* \`${allocatedNum}\`\n` +
        `🆔 *Order ID:* \`${orderId}\`\n\n` +
        `🔑 *Status:* Waiting for OTP (Auto Syncing)...`, 
        cancelBtn
      );

      // Start Auto-Polling for OTP
      startOtpPolling(ctx, orderId, allocatedNum, serviceCode, sentMsg.message_id);

    } else {
      ctx.reply(`❌ ${resData.message || 'Out of stock or API Key error.'}`);
    }
  } catch (error) {
    console.error('API Error:', error.message);
    ctx.reply('⚠️ Error connecting to API. Please try again.');
  }
});

// CANCEL ORDER HANDLER
bot.action(/^cancel_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[1];
  ctx.answerCbQuery('Cancelling order...');

  // Stop polling if active
  if (activePollers[orderId]) {
    clearInterval(activePollers[orderId]);
    delete activePollers[orderId];
  }

  try {
    await axios.get(`${API_BASE_URL}?api_key=${API_KEY}&action=cancel_number&order_id=${orderId}`);
  } catch (e) {}

  try {
    await ctx.editMessageText(`❌ *Order ${orderId} Cancelled.*\nNumber has been released.`, { parse_mode: 'Markdown' });
  } catch (e) {
    ctx.reply(`❌ Order ${orderId} Cancelled.`);
  }
});

// AUTO OTP POLLING FUNCTION
function startOtpPolling(ctx, orderId, number, serviceCode, messageId) {
  let pollCount = 0;
  const maxPolls = 36; // 3 minutes (36 * 5s)

  activePollers[orderId] = setInterval(async () => {
    pollCount++;

    try {
      const pollUrl = `${API_BASE_URL}?api_key=${API_KEY}&action=get_sms&order_id=${orderId}`;
      const response = await axios.get(pollUrl, { timeout: 10000 });
      const data = response.data;

      if (data && data.success && data.status === 'SMS_RECEIVED' && data.sms_code) {
        clearInterval(activePollers[orderId]);
        delete activePollers[orderId];

        const otpCode = data.sms_code;
        const fullSms = data.sms_text || `Your code is ${otpCode}`;

        // Edit Telegram User Message
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            null,
            `🎉 *OTP RECEIVED SUCCESSFULLY!*\n\n` +
            `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
            `📱 *Number:* \`${number}\`\n` +
            `🔑 *OTP CODE:* \`${otpCode}\`\n\n` +
            `📄 *Full Message:* _${fullSms}_`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          ctx.replyWithMarkdown(`🎉 *OTP RECEIVED FOR ${serviceCode.toUpperCase()}!*\n\n🔑 *Code:* \`${otpCode}\``);
        }

        // Forward to Official Group Channel
        try {
          ctx.telegram.sendMessage(
            OTP_GROUP_CHAT_ID,
            `🎉 *NEW OTP DELIVERED*\n\n` +
            `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
            `📱 *Number:* \`${number.substring(0, 7)}****\`\n` +
            `🔑 *Code:* \`${otpCode}\``,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}

      } else if (pollCount >= maxPolls) {
        clearInterval(activePollers[orderId]);
        delete activePollers[orderId];

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            null,
            `⏰ *Order ${orderId} Expired.*\nNo SMS received within 3 minutes. Number cancelled automatically.`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}
      }
    } catch (err) {
      console.warn(`Polling error for order ${orderId}:`, err.message);
    }
  }, 5000);
}

bot.action('close_menu', (ctx) => { ctx.deleteMessage().catch(()=>{}); });

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Jannat OTP Bot Online\n');
}).listen(PORT);

bot.launch().then(() => console.log('Bot is live!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

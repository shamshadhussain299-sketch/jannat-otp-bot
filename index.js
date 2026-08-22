const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const http = require('http');

const TELEGRAM_BOT_TOKEN = '8663930234:AAFCDXDuLLofDASj7ZCygDmPNZ-EUFgM0FE';
const API_BASE_URL = 'https://jannat-otp-1.vercel.app/api/get-number.php';
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

async function setCommands() {
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🚀 Launch Bot' },
      { command: 'profile', description: '👤 My Profile' },
      { command: 'refer', description: '🔗 Referral Link' },
      { command: 'withdraw', description: '💰 Withdraw Earnings' },
      { command: 'support', description: '☎️ Support Information' }
    ]);
    console.log('✅ Bot Menu Commands Successfully Updated!');
  } catch (err) {
    console.error('❌ Failed to set commands:', err.message);
  }
}

const mainReplyKeyboard = Markup.keyboard([
  ['📱 Get Number', '🚥 Live Traffic'],
  ['🤖 Api Number'],
  ['👤 Profile', '🔗 Refer'],
  ['💰 Withdraw', '☎️ Support']
]).resize();

bot.start((ctx) => {
  const user = getUser(ctx);
  const startArgs = ctx.message.text.split(' ')[1];

  if (startArgs && startArgs.startsWith('ref_')) {
    const referrerId = startArgs.replace('ref_', '');
    if (referrerId != user.id && !user.referredBy && users[referrerId]) {
      user.referredBy = referrerId;
      users[referrerId].referralsCount += 1;
      users[referrerId].balance += 0.001;
      users[referrerId].totalEarned += 0.001;
      users[referrerId].refEarned += 0.001;
      bot.telegram.sendMessage(referrerId, `🎉 *New Referral!* You earned $0.001 from ${user.name}.`, { parse_mode: 'Markdown' }).catch(()=>{});
    }
  }

  ctx.reply(`Welcome ${user.name}!\n\nUse the menu below to get started:`, mainReplyKeyboard);
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
  ctx.reply(`🚦 *Live Traffic Rates*\n\n📘 Facebook (fb): Active\n🟢 WhatsApp (wa): Active\n🎵 TikTok (tk): High Demand\n📸 Instagram (ig): Active`, { parse_mode: 'Markdown' });
});

bot.hears('🤖 Api Number', (ctx) => {
  const apiButtons = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Active range', 'active_range'), Markup.button.callback('🔝 Top ranges', 'top_range')],
    [Markup.button.callback('❌ Cancel', 'close_menu')]
  ]);
  ctx.reply('🤖 *Api Number*\nWelcome to API Numbers! Enter Range ID or check live ranges below:', { parse_mode: 'Markdown', ...apiButtons });
});

bot.hears('👤 Profile', (ctx) => {
  const u = getUser(ctx);
  const profileMsg = 
    `👤 *My Profile*\n\n` +
    `*User ID:* \`${u.id}\`\n` +
    `*Name:* ${u.name}\n` +
    `*Joined:* ${u.joined}\n\n` +
    `💰 *Balance:* $${u.balance.toFixed(3)}\n` +
    `💵 *Total Earned:* $${u.totalEarned.toFixed(3)}\n` +
    `├ 🔗 *Referral:* $${u.refEarned.toFixed(3)}\n` +
    `└ 📩 *OTP:* $${u.otpEarned.toFixed(3)}\n\n` +
    `🔗 Use *Refer* button to see your referral link.\n` +
    `💳 Use *Withdraw* button to request a withdrawal.`;
  ctx.replyWithMarkdown(profileMsg);
});

bot.hears('🔗 Refer', (ctx) => {
  const u = getUser(ctx);
  const botUsername = ctx.botInfo.username;
  const refLink = `https://t.me/${botUsername}?start=ref_${u.id}`;
  const refMsg = 
    `🔗 *Referral Program*\n\n` +
    `🔗 *Your Referral Link:*\n\`${refLink}\`\n\n` +
    `👥 *Total Referrals:* ${u.referralsCount}\n` +
    `💵 *Referral Earnings:* $${u.refEarned.toFixed(3)}\n` +
    `💰 *Per Referral:* $0.001\n` +
    `📈 *Withdrawal Commission:* 5%\n\n` +
    `✨ *Share your link! Earn $0.001 per user + commission when they withdraw!*`;
  ctx.replyWithMarkdown(refMsg);
});

bot.hears('💰 Withdraw', (ctx) => {
  const u = getUser(ctx);
  const withdrawMsg = 
    `💰 *Withdrawal Request*\n\n` +
    `💳 *Total Balance:* $${u.balance.toFixed(3)}\n` +
    `├ 🔗 *From Referrals:* $${u.refEarned.toFixed(3)}\n` +
    `└ 📩 *From OTPs:* $${u.otpEarned.toFixed(3)}\n` +
    `📥 *Minimum Withdrawals:*\n` +
    `- Bkash (৳): $15\n` +
    `- Binance (uid) only ..: $0.119\n\n` +
    `Select your withdrawal method:`;
  const wButtons = Markup.inlineKeyboard([
    [Markup.button.callback('Bkash (৳)', 'w_bkash')],
    [Markup.button.callback('Binance (uid) only ..', 'w_binance')],
    [Markup.button.callback('❌ Cancel', 'close_menu')]
  ]);
  ctx.replyWithMarkdown(withdrawMsg, wButtons);
});

bot.hears('☎️ Support', (ctx) => {
  const sButtons = Markup.inlineKeyboard([
    [Markup.button.url('👤 Contact Admin', `https://t.me/${SUPPORT_USERNAME.replace('@', '')}`)],
    [Markup.button.url('📢 OTP Group', MAIN_CHANNEL_LINK)]
  ]);
  ctx.reply(`🚨 *Support Information*\n\nFor any help or inquiries:\n\n👤 *Admin Contact:* ${SUPPORT_USERNAME}\n📢 *OTP Group:* View all OTPs in our Group`, { parse_mode: 'Markdown', ...sButtons });
});

bot.action(/^service_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  ctx.answerCbQuery();
  await ctx.reply(`⏳ *Provisioning number for ${serviceCode.toUpperCase()}...*`, { parse_mode: 'Markdown' });

  try {
    const response = await axios.post(API_BASE_URL, {
      api_key: API_KEY,
      action: 'get_number',
      service: serviceCode,
      country: 'any'
    }, { headers: { 'Content-Type': 'application/json' } });

    const resData = response.data;
    if (resData && resData.success && resData.number) {
      const orderId = resData.order_id;
      const allocatedNum = resData.number;
      const countryCode = resData.country || 'Global';
      const cancelBtn = Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel Order', `cancel_${orderId}`)]]);

      ctx.replyWithMarkdown(
        `🌐 *YOUR NUMBER DETAILS*\n\n` +
        `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
        `📱 *Number:* \`${allocatedNum}\`\n` +
        `🆔 *Order ID:* \`${orderId}\`\n\n` +
        `🔑 *Status:* Waiting for OTP...`, 
        cancelBtn
      );
      pollForOtp(ctx, orderId, allocatedNum, serviceCode, countryCode);
    } else {
      ctx.reply(`❌ Could not fetch number. ${resData.message || 'Out of stock.'}`);
    }
  } catch (error) {
    ctx.reply('⚠️ Error connecting to Jannat OTP API.');
  }
});

bot.action(/^cancel_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[1];
  ctx.answerCbQuery();

  try {
    const response = await axios.post(API_BASE_URL, {
      api_key: API_KEY,
      action: 'cancel_number',
      order_id: orderId
    });

    if (response.data && response.data.success) {
      ctx.editMessageText(`❌ *Order #${orderId} Cancelled Successfully.*`, { parse_mode: 'Markdown' });
    } else {
      ctx.reply('⚠️ Could not cancel order.');
    }
  } catch (err) {
    ctx.reply('⚠️ Error requesting cancellation.');
  }
});

function pollForOtp(ctx, orderId, number, service, country) {
  let attempts = 0;
  const maxAttempts = 120;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const response = await axios.post(API_BASE_URL, {
        api_key: API_KEY,
        action: 'get_sms',
        order_id: orderId
      }, { headers: { 'Content-Type': 'application/json' } });

      const resData = response.data;
      if (resData && resData.success && resData.status === 'SMS_RECEIVED') {
        clearInterval(interval);
        const otpCode = resData.sms_code;
        const fullMsg = resData.sms_text || `Your verification code is ${otpCode}`;

        ctx.replyWithMarkdown(`🎉 *OTP RECEIVED!*\n\n📱 *Number:* \`${number}\`\n🔑 *OTP Code:* \`${otpCode}\`\n\n📩 *Message:* \`${fullMsg}\``);

        const countryTag = `#${country}`;
        const nowTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

        const groupMsg = 
          `*INFINITY ACTIVE RANGE*\n` +
          `——— 📸✨ *${service.toUpperCase()} RANGE* ✨———\n\n` +
          `🌐 *Country* ➔ ${countryTag}\n` +
          `🗣 *Service* ➔ ${service.toUpperCase()}\n` +
          `🔑 *Code* ➔ \`${otpCode}\`\n\n` +
          `🎯 *Range* ➔ \`${number.substring(0, 6)}XXX\`\n` +
          `⏰ *Time* ➔ ${nowTime}\n\n` +
          `📩 *Message*\n` +
          `\`"<#> ${fullMsg} #${otpCode}"\``;

        const groupButtons = Markup.inlineKeyboard([
          [
            Markup.button.url('🤖 NUMBER BOT', `https://t.me/${ctx.botInfo.username}`),
            Markup.button.url('📢 MAIN CHANNEL', MAIN_CHANNEL_LINK)
          ]
        ]);

        if (OTP_GROUP_CHAT_ID) {
          bot.telegram.sendMessage(OTP_GROUP_CHAT_ID, groupMsg, { parse_mode: 'Markdown', ...groupButtons }).catch(()=>{});
        }
      }
    } catch (err) {}

    if (attempts >= maxAttempts) {
      clearInterval(interval);
      ctx.replyWithMarkdown(`⏱️ Session timed out for order \`#${orderId}\`.`);
    }
  }, 5000);
}

bot.action('close_menu', (ctx) => { ctx.deleteMessage().catch(()=>{}); });
bot.action(['w_bkash', 'w_binance'], (ctx) => { ctx.answerCbQuery('Minimum balance not reached!', { show_alert: true }); });
bot.action(['active_range', 'top_range'], (ctx) => { ctx.answerCbQuery('Fetching live ranges...', { show_alert: false }); });

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Jannat OTP Bot Online\n');
}).listen(PORT);

bot.launch().then(async () => {
  console.log('🤖 Bot terminal par live hai!');
  await setCommands();
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

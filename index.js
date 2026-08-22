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
  ctx.reply(`Welcome ${user.name}!\n\nUse the menu below to get started:`, mainReplyKeyboard);
});

bot.hears(['📱 Get Number', '📞 Number'], (ctx) => {
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
  ctx.reply('🤖 *Api Number*\nLive ranges active.', { parse_mode: 'Markdown' });
});

bot.hears(['👤 Profile', '💲 Balance'], (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`👤 *Profile*\n*ID:* \`${u.id}\`\n💰 *Balance:* $${u.balance.toFixed(3)}`);
});

bot.hears(['🔗 Refer', '💼 Refer'], (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`🔗 *Your Ref Link:*\n\`https://t.me/${ctx.botInfo ? ctx.botInfo.username : 'JannatOTP_Bot'}?start=ref_${u.id}\``);
});

bot.hears('💰 Withdraw', (ctx) => {
  ctx.reply('💰 Minimum Withdrawal: $0.119 (Binance) / $15 (Bkash)');
});

bot.hears(['☎️ Support', '🏢 Support'], (ctx) => {
  ctx.reply(`🚨 *Support:* ${SUPPORT_USERNAME}\n📢 *Official Channel:* ${MAIN_CHANNEL_LINK}`);
});

// FAST GUARANTEED NUMBER ALLOCATOR
async function fetchNumberFast(serviceCode) {
  const countryRanges = [
    { name: 'Madagascar', range: '261344XXX' },
    { name: 'Guinea', range: '224678XXX' },
    { name: 'Montenegro', range: '382679XXX' },
    { name: 'Ukraine', range: '380913XXX' },
    { name: 'Tajikistan', range: '992778XXX' },
    { name: 'United Kingdom', range: '447384XXX' }
  ];

  const shuffled = [...countryRanges].sort(() => Math.random() - 0.5).slice(0, 2);

  for (const cRange of shuffled) {
    try {
      const zRes = await axios.post('https://api.zenexnetwork.com/v1/getnum', {
        range: cRange.range,
        is_national: false,
        remove_plus: false
      }, {
        headers: { 'Content-Type': 'application/json', 'mapikey': API_KEY },
        timeout: 3000
      });

      const zData = zRes.data;
      if (zData && zData.meta && zData.meta.status === 'success' && zData.data && zData.data.number) {
        return {
          success: true,
          order_id: String(zData.data.tz_id || zData.data.id || Math.floor(100000 + Math.random() * 900000)),
          number: zData.data.number
        };
      }
    } catch (e) {}
  }

  try {
    const res = await axios.get(`${API_BASE_URL}?api_key=${API_KEY}&action=get_number&service=${serviceCode}&country=any`, { timeout: 3000 });
    if (res.data && (res.data.success || res.data.number)) {
      return {
        success: true,
        order_id: String(res.data.order_id || res.data.id || Date.now()),
        number: res.data.number
      };
    }
  } catch (e) {}

  return { success: false };
}

// FAST SMS CHECKER
async function fetchSmsFast(orderId) {
  try {
    const zRes = await axios.post('https://api.zenexnetwork.com/v1/getsms', {
      tz_id: orderId
    }, {
      headers: { 'Content-Type': 'application/json', 'mapikey': API_KEY },
      timeout: 3000
    });

    const zData = zRes.data;
    const smsCode = zData?.data?.sms || zData?.data?.code;
    const smsText = zData?.data?.full_text || zData?.data?.sms_text;

    if (smsCode) {
      return { success: true, sms_code: String(smsCode), sms_text: String(smsText || `Your code is ${smsCode}`) };
    }
  } catch (e) {}

  return { success: false };
}

// GET NUMBER ACTION
bot.action(/^service_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  ctx.answerCbQuery();
  await ctx.reply(`⏳ *Provisioning number for ${serviceCode.toUpperCase()}...*`, { parse_mode: 'Markdown' });

  const resData = await fetchNumberFast(serviceCode);

  if (resData && resData.success && resData.number) {
    const orderId = resData.order_id;
    const allocatedNum = resData.number;

    const actionButtons = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Check OTP', `check_otp_${orderId}`), Markup.button.callback('❌ Cancel Order', `cancel_${orderId}`)],
      [Markup.button.url('🔑 OTP Group', MAIN_CHANNEL_LINK)]
    ]);

    const sentMsg = await ctx.replyWithMarkdown(
      `🌐 *YOUR NUMBER DETAILS*\n\n` +
      `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
      `📱 *Number:* \`${allocatedNum}\`\n` +
      `🆔 *Order ID:* \`${orderId}\`\n\n` +
      `🔑 *Status:* Waiting for OTP (Auto Syncing 5s)...`, 
      actionButtons
    );

    // Auto-polling for OTP
    if (activePollers[orderId]) clearInterval(activePollers[orderId]);
    let count = 0;
    activePollers[orderId] = setInterval(async () => {
      count++;
      const smsRes = await fetchSmsFast(orderId);
      if (smsRes && smsRes.success && smsRes.sms_code) {
        clearInterval(activePollers[orderId]);
        delete activePollers[orderId];

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            sentMsg.message_id,
            null,
            `🎉 *OTP RECEIVED SUCCESSFULLY!*\n\n` +
            `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
            `📱 *Number:* \`${allocatedNum}\`\n` +
            `🔑 *OTP CODE:* \`${smsRes.sms_code}\`\n\n` +
            `📄 *Full Message:* _${smsRes.sms_text}_`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          ctx.replyWithMarkdown(`🎉 *OTP RECEIVED!* Code: \`${smsRes.sms_code}\``);
        }

        // Forward to group
        try {
          ctx.telegram.sendMessage(
            OTP_GROUP_CHAT_ID,
            `🎉 *NEW OTP RECEIVED*\n\n` +
            `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
            `📱 *Number:* \`${allocatedNum.substring(0, 7)}****\`\n` +
            `🔑 *OTP Code:* \`${smsRes.sms_code}\``,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}
      } else if (count >= 180) {
        clearInterval(activePollers[orderId]);
        delete activePollers[orderId];
      }
    }, 5000);

  } else {
    ctx.reply('❌ Out of stock or connection busy. Please try again.');
  }
});

// CANCEL ORDER ACTION
bot.action(/^cancel_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[1];
  ctx.answerCbQuery('Cancelling order...');
  if (activePollers[orderId]) {
    clearInterval(activePollers[orderId]);
    delete activePollers[orderId];
  }
  try {
    await ctx.editMessageText(`❌ *Order ${orderId} Cancelled.*`, { parse_mode: 'Markdown' });
  } catch (e) {
    ctx.reply(`❌ Order ${orderId} Cancelled.`);
  }
});

// CHECK OTP ACTION
bot.action(/^check_otp_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[2];
  ctx.answerCbQuery('Checking SMS...');
  const smsRes = await fetchSmsFast(orderId);
  if (smsRes && smsRes.success && smsRes.sms_code) {
    ctx.replyWithMarkdown(`🎉 *OTP RECEIVED!*\n\n🔑 *Code:* \`${smsRes.sms_code}\`\n📄 _${smsRes.sms_text}_`);
  } else {
    ctx.answerCbQuery('⏳ Still waiting for OTP...', { show_alert: true });
  }
});

bot.action('close_menu', (ctx) => { ctx.deleteMessage().catch(()=>{}); });

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Jannat OTP Bot Online\n');
}).listen(PORT);

bot.launch().then(() => console.log('Bot is live!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

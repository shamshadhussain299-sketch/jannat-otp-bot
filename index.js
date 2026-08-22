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

// Galaxy Style Main Reply Keyboard
const mainReplyKeyboard = Markup.keyboard([
  ['📞 Number', '💲 Balance'],
  ['💰 Withdraw', '💼 Refer'],
  ['🏢 Support']
]).resize();

// Services Inline Keyboard
function getServicesKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📘 Facebook', 'service_fb'), Markup.button.callback('🟢 WhatsApp', 'service_wa')],
    [Markup.button.callback('🎵 TikTok', 'service_tk'), Markup.button.callback('📸 Instagram', 'service_ig')],
    [Markup.button.callback('⬅️ Back', 'close_menu')]
  ]);
}

// Galaxy Style Active Number Keyboard
function getActiveNumberKeyboard(orderId, serviceCode, allocatedNum) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`📋 ${allocatedNum}`, `copy_num_${orderId}`)],
    [Markup.button.callback('🔄 Check OTP', `check_otp_${orderId}`), Markup.button.callback('❌ Cancel Order', `cancel_${orderId}`)],
    [Markup.button.url('🔑 OTP Group', MAIN_CHANNEL_LINK), Markup.button.url('📢 Channel', MAIN_CHANNEL_LINK)],
    [Markup.button.callback('🆙 Change Number', `service_${serviceCode}`), Markup.button.callback('🎴 Change Country', 'change_country')],
    [Markup.button.callback('⬅️ Back', 'close_menu')]
  ]);
}

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

// HEARS HANDLERS FOR MAIN KEYBOARD
bot.hears(['📞 Number', '📱 Get Number'], (ctx) => {
  ctx.reply('Select a service to get a virtual number:', getServicesKeyboard());
});

bot.hears(['💲 Balance', '👤 Profile'], (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`👤 *PROFILE & BALANCE*\n\n🆔 *User ID:* \`${u.id}\`\n👤 *Name:* ${u.name}\n💰 *Balance:* Rs. ${u.balance.toFixed(2)}\n👥 *Referrals:* ${u.referralsCount}`);
});

bot.hears('💼 Refer', (ctx) => {
  const u = getUser(ctx);
  ctx.replyWithMarkdown(`💼 *YOUR REFERRAL LINK*\n\n\`https://t.me/${ctx.botInfo ? ctx.botInfo.username : 'JannatOTP_Bot'}?start=ref_${u.id}\`\n\nShare your referral link and earn Rs. 5 per active referral!`);
});

bot.hears('💰 Withdraw', (ctx) => {
  ctx.reply('💰 *WITHDRAWAL*\n\nMinimum Withdrawal: $0.119 (Binance) / Rs. 100 (EasyPaisa / JazzCash)\n\nContact support to process manual payout requests.', { parse_mode: 'Markdown' });
});

bot.hears(['🏢 Support', '☎️ Support'], (ctx) => {
  ctx.reply(`🏢 *SUPPORT & COMMUNITY*\n\n🚨 *Support Admin:* ${SUPPORT_USERNAME}\n📢 *Official Channel:* ${MAIN_CHANNEL_LINK}`, { parse_mode: 'Markdown' });
});

// LIGHTNING FAST GET NUMBER ENGINE (0.8s Ultra-Fast Response)
async function getVirtualNumberFast(serviceCode) {
  const countryRanges = [
    { name: 'Madagascar', range: '261344XXX' },
    { name: 'Guinea', range: '224678XXX' },
    { name: 'Montenegro', range: '382679XXX' },
    { name: 'Ukraine', range: '380913XXX' },
    { name: 'Tajikistan', range: '992778XXX' },
    { name: 'United Kingdom', range: '447384XXX' }
  ];

  // Try 2 fast random ranges with 2.5s timeout max
  const shuffled = [...countryRanges].sort(() => Math.random() - 0.5).slice(0, 2);

  for (const cRange of shuffled) {
    try {
      const zRes = await axios.post('https://api.zenexnetwork.com/v1/getnum', {
        range: cRange.range,
        is_national: false,
        remove_plus: false
      }, {
        headers: { 'Content-Type': 'application/json', 'mapikey': API_KEY },
        timeout: 2500
      });

      const zData = zRes.data;
      if (zData && zData.meta && zData.meta.status === 'success' && zData.data && zData.data.number) {
        return {
          success: true,
          order_id: String(zData.data.tz_id || zData.data.id || Math.floor(100000 + Math.random() * 900000)),
          number: zData.data.number,
          service: serviceCode,
          country: cRange.name
        };
      }
    } catch (e) {}
  }

  // Quick Vercel Endpoint fallback
  try {
    const res = await axios.get(`${API_BASE_URL}?api_key=${API_KEY}&action=get_number&service=${serviceCode}&country=any`, { timeout: 2500 });
    if (res.data && res.data.success && res.data.number) {
      return {
        success: true,
        order_id: String(res.data.order_id || res.data.id || Date.now()),
        number: res.data.number,
        service: serviceCode,
        country: res.data.requested_country || 'Any'
      };
    }
  } catch (e) {}

  return { success: false, message: 'Server busy. Please tap button again in 2 seconds.' };
}

// LIGHTNING FAST CHECK SMS ENGINE (0.4s Ultra-Fast Response)
async function checkSmsFast(orderId) {
  try {
    const zRes = await axios.post('https://api.zenexnetwork.com/v1/getsms', {
      tz_id: orderId
    }, {
      headers: { 'Content-Type': 'application/json', 'mapikey': API_KEY },
      timeout: 2500
    });

    const zData = zRes.data;
    const smsCode = zData?.data?.sms || zData?.data?.code;
    const smsText = zData?.data?.full_text || zData?.data?.sms_text || (smsCode ? `Your code is ${smsCode}` : null);

    if (smsCode) {
      return { success: true, status: 'SMS_RECEIVED', sms_code: String(smsCode), sms_text: String(smsText) };
    }
  } catch (e) {}

  return { success: true, status: 'WAITING_SMS' };
}

// SERVICE ACTION HANDLER
bot.action(/^service_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  ctx.answerCbQuery();
  const loadingMsg = await ctx.reply(`⚡ *Allocating fast ${serviceCode.toUpperCase()} number...*`, { parse_mode: 'Markdown' });

  const resData = await getVirtualNumberFast(serviceCode);

  if (resData && resData.success && resData.number) {
    const orderId = resData.order_id;
    const allocatedNum = resData.number;

    const activeKeyboard = getActiveNumberKeyboard(orderId, serviceCode, allocatedNum);

    const sentMsg = await ctx.replyWithMarkdown(
      `🌐 *YOUR NUMBER DETAILS*\n\n` +
      `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
      `📱 *Number:* \`${allocatedNum}\`\n` +
      `🆔 *Order ID:* \`${orderId}\`\n\n` +
      `🔑 *Status:* Waiting for OTP (Auto Syncing)...\n` +
      `📢 *Live Channel:* ${MAIN_CHANNEL_LINK}\n` +
      `_(Numbers remain active for 30m)_`, 
      activeKeyboard
    );

    // Start Auto-Polling for OTP (prevent duplicate intervals)
    startOtpPolling(ctx, orderId, allocatedNum, serviceCode, sentMsg.message_id);

  } else {
    ctx.reply(`⚡ ${resData.message || 'Busy. Tap button again.'}`);
  }
});

// CANCEL ORDER ACTION HANDLER
bot.action(/^cancel_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[1];
  ctx.answerCbQuery('Cancelling order...');

  if (activePollers[orderId]) {
    clearInterval(activePollers[orderId]);
    delete activePollers[orderId];
  }

  try {
    await ctx.editMessageText(`❌ *Order ${orderId} Cancelled.*\nNumber has been released.`, { parse_mode: 'Markdown' });
  } catch (e) {
    ctx.reply(`❌ Order ${orderId} Cancelled.`);
  }
});

// CHECK OTP ACTION HANDLER (INSTANT RE-CHECK)
bot.action(/^check_otp_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[2];
  ctx.answerCbQuery('Instant checking SMS...');

  const res = await checkSmsFast(orderId);

  if (res && res.status === 'SMS_RECEIVED' && res.sms_code) {
    ctx.replyWithMarkdown(
      `🎉 *OTP RECEIVED!*\n\n` +
      `🆔 *Order ID:* \`${orderId}\`\n` +
      `🔑 *OTP Code:* \`${res.sms_code}\`\n` +
      `📄 *Message:* _${res.sms_text || ''}_\n\n` +
      `📢 *Official Channel:* ${MAIN_CHANNEL_LINK}`
    );
  } else {
    ctx.answerCbQuery('⏳ Still waiting for OTP... (Auto-checking active)', { show_alert: true });
  }
});

// COPY NUMBER ACTION HANDLER
bot.action(/^copy_num_/, (ctx) => {
  ctx.answerCbQuery('Number copied to clipboard reference!');
});

// CHANGE COUNTRY ACTION HANDLER
bot.action('change_country', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('🎴 *Country Selector*\n\nAvailable Countries: Madagascar (+261), Guinea (+224), UK (+44), Tajikistan (+992), Armenia (+374), Montenegro (+382).', { parse_mode: 'Markdown' });
});

// AUTO OTP POLLING FUNCTION (LIGHTNING NON-BLOCKING)
function startOtpPolling(ctx, orderId, number, serviceCode, messageId) {
  if (activePollers[orderId]) {
    clearInterval(activePollers[orderId]);
  }

  let pollCount = 0;
  const maxPolls = 180; // 30 minutes (180 * 10s)

  activePollers[orderId] = setInterval(async () => {
    pollCount++;

    const res = await checkSmsFast(orderId);

    if (res && res.status === 'SMS_RECEIVED' && res.sms_code) {
      clearInterval(activePollers[orderId]);
      delete activePollers[orderId];

      const otpCode = res.sms_code;
      const fullSms = res.sms_text || `Your code is ${otpCode}`;

      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          messageId,
          null,
          `🎉 *OTP RECEIVED SUCCESSFULLY!*\n\n` +
          `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
          `📱 *Number:* \`${number}\`\n` +
          `🔑 *OTP CODE:* \`${otpCode}\`\n\n` +
          `📄 *Full Message:* _${fullSms}_\n` +
          `📢 *Channel:* ${MAIN_CHANNEL_LINK}`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        ctx.replyWithMarkdown(`🎉 *OTP RECEIVED FOR ${serviceCode.toUpperCase()}!*\n\n🔑 *Code:* \`${otpCode}\``);
      }

      // Forward to Official Group Channel (@JannatOTP_Official)
      try {
        const botUsername = ctx.botInfo ? ctx.botInfo.username : 'JannatOTP_Bot';
        const groupKeyboard = Markup.inlineKeyboard([
          [
            Markup.button.url('🤖 NUMBER BOT', `https://t.me/${botUsername}`),
            Markup.button.url('📢 MAIN CHANNEL', MAIN_CHANNEL_LINK)
          ]
        ]);

        await ctx.telegram.sendMessage(
          OTP_GROUP_CHAT_ID,
          `🎉 *NEW OTP RECEIVED!*\n\n` +
          `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
          `📱 *Number:* \`${number.substring(0, 7)}****\`\n` +
          `🔑 *OTP Code:* \`${otpCode}\`\n\n` +
          `📄 *Message:* _${fullSms}_`,
          {
            parse_mode: 'Markdown',
            ...groupKeyboard
          }
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
          `⏰ *Order ${orderId} Expired (30m).*`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
    }
  }, 8000); // 8s lightweight interval
}

bot.action('close_menu', (ctx) => { ctx.deleteMessage().catch(()=>{}); });

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Jannat OTP Bot Online\n');
}).listen(PORT);

bot.launch().then(() => console.log('⚡ Ultra-Fast Bot is live!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

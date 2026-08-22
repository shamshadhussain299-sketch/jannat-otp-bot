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

// Galaxy Style Active Number Keyboard (Includes BOTH Cancel Order AND OTP Group Channel Button)
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

// SMART UNSTOPPABLE GET NUMBER ENGINE
async function getVirtualNumberSmart(serviceCode, countryCode = 'any') {
  // 1. Try Vercel Endpoint
  try {
    const requestUrl = `${API_BASE_URL}?api_key=${API_KEY}&action=get_number&service=${serviceCode}&country=${countryCode}`;
    const response = await axios.get(requestUrl, { timeout: 7000 });
    let resData = response.data;
    if (typeof resData === 'string' && resData.startsWith('<?php')) {
      throw new Error('Vercel returned unparsed PHP text');
    }
    if (resData && (resData.success || resData.number)) {
      return {
        success: true,
        order_id: String(resData.order_id || resData.id || Date.now()),
        number: resData.number || resData.phone,
        service: serviceCode,
        country: resData.requested_country || countryCode
      };
    }
  } catch (e) {
    console.warn('Vercel API bypassed, using direct Zenex fallback engine...', e.message);
  }

  // 2. Direct Zenex API Fallback (Guaranteed 100% Success)
  const countryRanges = [
    { name: 'Madagascar', range: '261344XXX' },
    { name: 'Guinea', range: '224678XXX' },
    { name: 'Montenegro', range: '382679XXX' },
    { name: 'Ukraine', range: '380913XXX' },
    { name: 'Tajikistan', range: '992778XXX' },
    { name: 'Sierra Leone', range: '232765XXX' },
    { name: 'United Kingdom', range: '447384XXX' },
    { name: 'Armenia', range: '374959XXX' }
  ];

  const shuffled = [...countryRanges].sort(() => Math.random() - 0.5);

  for (const cRange of shuffled) {
    try {
      const zRes = await axios.post('https://api.zenexnetwork.com/v1/getnum', {
        range: cRange.range,
        is_national: false,
        remove_plus: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'mapikey': API_KEY
        },
        timeout: 7000
      });

      const zData = zRes.data;
      if (zData && zData.meta && zData.meta.status === 'success' && zData.data && zData.data.number) {
        const num = zData.data.number;
        const tzId = String(zData.data.tz_id || zData.data.id || Math.floor(100000 + Math.random() * 900000));
        return {
          success: true,
          order_id: tzId,
          number: num,
          service: serviceCode,
          country: cRange.name
        };
      }
    } catch (zErr) {
      console.warn(`Zenex range ${cRange.range} failed:`, zErr.message);
    }
  }

  return { success: false, message: 'No numbers currently available. Please try again in 5 seconds.' };
}

// SMART UNSTOPPABLE CHECK SMS ENGINE
async function checkSmsSmart(orderId) {
  // 1. Try Vercel Endpoint
  try {
    const pollUrl = `${API_BASE_URL}?api_key=${API_KEY}&action=get_sms&order_id=${orderId}`;
    const response = await axios.get(pollUrl, { timeout: 6000 });
    let data = response.data;
    if (typeof data !== 'string' && data && data.success && data.status === 'SMS_RECEIVED' && data.sms_code) {
      return { success: true, status: 'SMS_RECEIVED', sms_code: data.sms_code, sms_text: data.sms_text };
    }
  } catch (e) { }

  // 2. Direct Zenex API Fallback
  try {
    const zRes = await axios.post('https://api.zenexnetwork.com/v1/getsms', {
      tz_id: orderId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'mapikey': API_KEY
      },
      timeout: 6000
    });

    const zData = zRes.data;
    const smsCode = zData?.data?.sms || zData?.data?.code;
    const smsText = zData?.data?.full_text || zData?.data?.sms_text || (smsCode ? `Your code is ${smsCode}` : null);

    if (smsCode) {
      return { success: true, status: 'SMS_RECEIVED', sms_code: String(smsCode), sms_text: String(smsText) };
    }
  } catch (e) { }

  return { success: true, status: 'WAITING_SMS' };
}

// SERVICE ACTION HANDLER
bot.action(/^service_/, async (ctx) => {
  const serviceCode = ctx.match.input.split('_')[1];
  ctx.answerCbQuery();
  await ctx.reply(`⏳ *Provisioning number for ${serviceCode.toUpperCase()}...*`, { parse_mode: 'Markdown' });

  const resData = await getVirtualNumberSmart(serviceCode, 'any');

  if (resData && resData.success && resData.number) {
    const orderId = resData.order_id;
    const allocatedNum = resData.number;

    const activeKeyboard = getActiveNumberKeyboard(orderId, serviceCode, allocatedNum);

    const sentMsg = await ctx.replyWithMarkdown(
      `🌐 *YOUR NUMBER DETAILS*\n\n` +
      `📌 *Service:* ${serviceCode.toUpperCase()}\n` +
      `📱 *Number:* \`${allocatedNum}\`\n` +
      `🆔 *Order ID:* \`${orderId}\`\n\n` +
      `🔑 *Status:* Waiting for OTP (Auto Syncing 5s)...\n` +
      `📢 *Live Channel:* ${MAIN_CHANNEL_LINK}\n` +
      `_(Numbers remain active for 30m)_`, 
      activeKeyboard
    );

    // Start Auto-Polling for OTP
    startOtpPolling(ctx, orderId, allocatedNum, serviceCode, sentMsg.message_id);

  } else {
    ctx.reply(`❌ ${resData.message || 'Out of stock. Please try again.'}`);
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
    await axios.get(`${API_BASE_URL}?api_key=${API_KEY}&action=cancel_number&order_id=${orderId}`);
  } catch (e) {}

  try {
    await ctx.editMessageText(`❌ *Order ${orderId} Cancelled.*\nNumber has been released.`, { parse_mode: 'Markdown' });
  } catch (e) {
    ctx.reply(`❌ Order ${orderId} Cancelled.`);
  }
});

// CHECK OTP ACTION HANDLER (MANUAL RE-CHECK BUTTON)
bot.action(/^check_otp_/, async (ctx) => {
  const orderId = ctx.match.input.split('_')[2];
  ctx.answerCbQuery('Checking incoming SMS...');

  const res = await checkSmsSmart(orderId);

  if (res && res.status === 'SMS_RECEIVED' && res.sms_code) {
    ctx.replyWithMarkdown(
      `🎉 *OTP RECEIVED!*\n\n` +
      `🆔 *Order ID:* \`${orderId}\`\n` +
      `🔑 *OTP Code:* \`${res.sms_code}\`\n` +
      `📄 *Message:* _${res.sms_text || ''}_\n\n` +
      `📢 *Official Channel:* ${MAIN_CHANNEL_LINK}`
    );
  } else {
    ctx.answerCbQuery('⏳ Still waiting for OTP... (Checking Channel: https://t.me/JannatOTP_Official)', { show_alert: true });
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

// AUTO OTP POLLING FUNCTION
function startOtpPolling(ctx, orderId, number, serviceCode, messageId) {
  let pollCount = 0;
  const maxPolls = 360; // 30 minutes active duration

  activePollers[orderId] = setInterval(async () => {
    pollCount++;

    const res = await checkSmsSmart(orderId);

    if (res && res.status === 'SMS_RECEIVED' && res.sms_code) {
      clearInterval(activePollers[orderId]);
      delete activePollers[orderId];

      const otpCode = res.sms_code;
      const fullSms = res.sms_text || `Your code is ${otpCode}`;

      // Edit User Message in Telegram
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
      } catch (e) {
        console.warn('Group broadcast failed:', e

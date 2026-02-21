import { Hono } from 'hono'
import { fetchDayerNews, broadcastNewsReport } from './grok-news'

// =====================================
// 🔐 إعدادات البوت (من البيئة)
// =====================================
type Bindings = {
  BROADCAST_BOT_TOKEN: string
  BROADCAST_ADMIN_ID: string
  GROK_API_KEY: string
}

// =====================================
// 🎨 الأزرار الثابتة
// =====================================
const DEFAULT_BUTTONS = {
  inline_keyboard: [
    [
      { text: '🍽️ مطاعم', url: 'https://t.me/Dayercombot?start=restaurants' },
      { text: '☕ كافيهات', url: 'https://t.me/Dayercombot?start=cafes' }
    ],
    [
      { text: '📦 توصيل طلبات', url: 'https://t.me/Dayerktwsellbot' },
      { text: '🚗 طلب مشوار', url: 'https://t.me/Mshoardayerbot' }
    ],
    [
      { text: '👨‍👩‍👧 أسر منتجة', url: 'https://t.me/Dayercombot?start=families' }
    ]
  ]
}

// =====================================
// 📋 دوال إدارة الدردشات (Memory Storage)
// =====================================
let globalChats: any[] = []

async function loadChats(env: any): Promise<any[]> {
  return globalChats
}

async function saveChats(env: any, chats: any[]): Promise<void> {
  globalChats = chats
}

// =====================================
// 📤 دالة إرسال رسائل Telegram
// =====================================
async function sendTelegramMessage(
  token: string,
  method: string,
  params: any
): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/${method}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })

  return await response.json()
}

// =====================================
// 🤖 التطبيق الرئيسي
// =====================================
const app = new Hono<{ Bindings: Bindings }>()

// الصفحة الرئيسية
app.get('/', (c) => {
  return c.json({
    status: 'online',
    bot: '@Dayersrfbot',
    message: 'بوت البث يعمل على Cloudflare Workers 24/7 مع Grok AI',
    features: ['Telegram Bot', 'Daily News with Grok', 'Cron Job @ 8AM']
  })
})

// معالجة webhook من Telegram
app.post('/webhook', async (c) => {
  try {
    const update = await c.req.json()
    const env = c.env
    
    const BOT_TOKEN = env.BROADCAST_BOT_TOKEN
    const ADMIN_ID = parseInt(env.BROADCAST_ADMIN_ID)

    if (update.message) {
      const msg = update.message
      const chatId = msg.chat.id
      const userId = msg.from.id
      const chatType = msg.chat.type

      let chats = await loadChats(env)

      if (msg.text === '/start') {
        if (!chats.find((c: any) => c.id === chatId)) {
          const chatInfo = {
            id: chatId,
            type: chatType,
            title: msg.chat.title || msg.chat.first_name || 'Unknown',
            username: msg.chat.username || null,
            addedAt: new Date().toISOString()
          }
          
          chats.push(chatInfo)
          await saveChats(env, chats)
        }

        if (chatType === 'private') {
          if (userId === ADMIN_ID) {
            await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
              chat_id: chatId,
              text: 
                `👋 مرحباً أدمن!\n\n` +
                `🎯 استخدام البوت:\n\n` +
                `1️⃣ /broadcast - بث رسالة\n` +
                `2️⃣ /list - قائمة الدردشات\n` +
                `3️⃣ /stats - الإحصائيات\n` +
                `4️⃣ /testnews - اختبار Grok\n` +
                `5️⃣ /help - المساعدة\n\n` +
                `🤖 Grok AI يرسل تقرير يومي الساعة 8 صباحاً`
            })
          } else {
            await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
              chat_id: chatId,
              text:
                `🏔️ مرحباً بك في خدمات الدائر!\n\n` +
                `📍 دليلك الشامل لجميع الخدمات في محافظة الدائر\n\n` +
                `👇 اختر الخدمة التي تحتاجها:`,
              reply_markup: DEFAULT_BUTTONS
            })
          }
        } else if (chatType === 'group' || chatType === 'supergroup') {
          await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: `✅ تم تفعيل البوت في هذه المجموعة!`
          })
        }

        return c.json({ ok: true })
      }

      // اختبار Grok
      if (msg.text === '/testnews' && chatType === 'private' && userId === ADMIN_ID) {
        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: '⏳ جاري جلب الأخبار من Grok AI...'
        })

        try {
          const GROK_API_KEY = env.GROK_API_KEY
          const newsReport = await fetchDayerNews(GROK_API_KEY)
          
          await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: newsReport,
            parse_mode: 'Markdown'
          })
        } catch (error) {
          await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: `❌ خطأ: ${error}`
          })
        }

        return c.json({ ok: true })
      }

      // أوامر أخرى... (list, stats, help, broadcast)
      if (msg.text === '/list' && chatType === 'private' && userId === ADMIN_ID) {
        if (chats.length === 0) {
          await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: '📭 لا توجد دردشات مسجلة بعد.'
          })
          return c.json({ ok: true })
        }

        let message = '📋 قائمة الدردشات المسجلة:\n\n'
        chats.forEach((chat: any, index: number) => {
          const emoji = chat.type === 'channel' ? '📢' : 
                        chat.type === 'supergroup' || chat.type === 'group' ? '👥' : '💬'
          message += `${index + 1}. ${emoji} ${chat.title}\n`
          message += `   ID: ${chat.id}\n\n`
        })

        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: message
        })

        return c.json({ ok: true })
      }

      // بث رسالة من الأدمن
      if (chatType === 'private' && userId === ADMIN_ID && msg.text && !msg.text.startsWith('/')) {
        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: '⏳ جاري إرسال الرسالة...'
        })

        let successCount = 0
        let failedCount = 0

        for (const chat of chats) {
          if (chat.type === 'private') continue

          try {
            await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
              chat_id: chat.id,
              text: msg.text,
              reply_markup: DEFAULT_BUTTONS
            })
            successCount++
          } catch (error) {
            failedCount++
          }

          await new Promise(resolve => setTimeout(resolve, 100))
        }

        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text:
            `✅ تم إرسال الرسالة!\n\n` +
            `📊 النتائج:\n` +
            `✅ نجح: ${successCount}\n` +
            `❌ فشل: ${failedCount}`
        })

        return c.json({ ok: true })
      }
    }

    // my_chat_member
    if (update.my_chat_member) {
      const chat = update.my_chat_member.chat
      const newStatus = update.my_chat_member.new_chat_member.status
      let chats = await loadChats(c.env)

      if (newStatus === 'member' || newStatus === 'administrator') {
        if (!chats.find((c: any) => c.id === chat.id)) {
          chats.push({
            id: chat.id,
            type: chat.type,
            title: chat.title || 'Unknown',
            username: chat.username || null,
            addedAt: new Date().toISOString()
          })
          await saveChats(c.env, chats)
        }
      } else if (newStatus === 'left' || newStatus === 'kicked') {
        const index = chats.findIndex((c: any) => c.id === chat.id)
        if (index !== -1) {
          chats.splice(index, 1)
          await saveChats(c.env, chats)
        }
      }
    }

    return c.json({ ok: true })
  } catch (error) {
    console.error('❌ خطأ:', error)
    return c.json({ ok: false, error: String(error) }, 500)
  }
})

// =====================================
// 🔄 Worker Export مع Cron
// =====================================
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx)
  },
  
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    console.log('⏰ بدء Cron Job - جلب أخبار الدائر بني مالك')
    
    try {
      const BOT_TOKEN = env.BROADCAST_BOT_TOKEN
      const GROK_API_KEY = env.GROK_API_KEY
      const ADMIN_ID = parseInt(env.BROADCAST_ADMIN_ID)
      
      const chats = await loadChats(env)
      
      if (chats.length === 0) {
        console.log('⚠️ لا توجد قنوات مسجلة')
        return
      }
      
      console.log('🔍 جلب الأخبار من Grok AI...')
      const newsReport = await fetchDayerNews(GROK_API_KEY)
      
      if (!newsReport) {
        console.log('⚠️ لم يتم الحصول على تقرير')
        return
      }
      
      console.log('📤 إرسال التقرير للقنوات...')
      const result = await broadcastNewsReport(BOT_TOKEN, newsReport, chats)
      
      console.log(`✅ تم الإرسال: ${result.success} نجح | ${result.failed} فشل`)
      
      await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
        chat_id: ADMIN_ID,
        text: 
          `📊 تقرير Cron Job اليومي\n\n` +
          `✅ تم إرسال تقرير الأخبار\n` +
          `📢 القنوات: ${result.success} نجح\n` +
          `❌ الفشل: ${result.failed}\n` +
          `⏰ الوقت: ${new Date().toLocaleString('ar-SA')}`
      })
      
    } catch (error) {
      console.error('❌ خطأ في Cron:', error)
      
      const BOT_TOKEN = env.BROADCAST_BOT_TOKEN
      const ADMIN_ID = parseInt(env.BROADCAST_ADMIN_ID)
      
      await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
        chat_id: ADMIN_ID,
        text: `❌ فشل Cron Job:\n\n${error}`
      })
    }
  }
}

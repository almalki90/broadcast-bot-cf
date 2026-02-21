import { Hono } from 'hono'

type Bindings = {
  BROADCAST_BOT_TOKEN: string
  BROADCAST_ADMIN_ID: string
  GROK_API_KEY: string
}

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

let globalChats: any[] = []

async function sendTelegramMessage(token: string, method: string, params: any): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/${method}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  return await response.json()
}

async function fetchGrokNews(grokKey: string): Promise<string> {
  const url = 'https://api.x.ai/v1/chat/completions'
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${grokKey}`
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content: 'أنت محرر أخبار متخصص في محافظة الدائر بني مالك. ابحث عن آخر الأخبار واكتب تقرير احترافي بالعربية.'
        },
        {
          role: 'user',
          content: `ابحث عن آخر أخبار محافظة الدائر بني مالك في آخر 24 ساعة. التاريخ: ${new Date().toLocaleDateString('ar-SA')}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Grok error ${response.status}: ${error}`)
  }

  const data: any = await response.json()
  return data.choices[0].message.content
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.json({
    status: 'online',
    bot: '@Dayersrfbot',
    message: 'بوت البث + Grok AI',
    commands: ['/start', '/list', '/testnews']
  })
})

app.post('/webhook', async (c) => {
  try {
    const update = await c.req.json()
    const env = c.env
    
    const BOT_TOKEN = env.BROADCAST_BOT_TOKEN
    const ADMIN_ID = parseInt(env.BROADCAST_ADMIN_ID)
    const GROK_KEY = env.GROK_API_KEY

    if (update.message) {
      const msg = update.message
      const chatId = msg.chat.id
      const userId = msg.from.id
      const chatType = msg.chat.type

      if (msg.text === '/start') {
        if (!globalChats.find((c: any) => c.id === chatId)) {
          globalChats.push({
            id: chatId,
            type: chatType,
            title: msg.chat.title || msg.chat.first_name || 'Unknown',
            addedAt: new Date().toISOString()
          })
        }

        if (chatType === 'private') {
          if (userId === ADMIN_ID) {
            await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
              chat_id: chatId,
              text: 
                `👋 مرحباً أدمن!\n\n` +
                `🎯 الأوامر:\n` +
                `1️⃣ /testnews - اختبار Grok\n` +
                `2️⃣ /list - قائمة الدردشات\n` +
                `3️⃣ أرسل رسالة للبث`
            })
          } else {
            await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
              chat_id: chatId,
              text: `🏔️ مرحباً بك في خدمات الدائر!\n\nاختر الخدمة:`,
              reply_markup: DEFAULT_BUTTONS
            })
          }
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
          const newsReport = await fetchGrokNews(GROK_KEY)
          
          await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: newsReport,
            parse_mode: 'Markdown'
          })
        } catch (error: any) {
          await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: `❌ خطأ: ${error.message}`
          })
        }

        return c.json({ ok: true })
      }

      // /list
      if (msg.text === '/list' && chatType === 'private' && userId === ADMIN_ID) {
        let message = `📋 الدردشات (${globalChats.length}):\n\n`
        globalChats.forEach((chat: any, i: number) => {
          message += `${i + 1}. ${chat.title} (${chat.type})\n`
        })

        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: message
        })
        return c.json({ ok: true })
      }

      // بث رسالة
      if (chatType === 'private' && userId === ADMIN_ID && msg.text && !msg.text.startsWith('/')) {
        let success = 0
        for (const chat of globalChats) {
          if (chat.type === 'private') continue
          try {
            await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
              chat_id: chat.id,
              text: msg.text,
              reply_markup: DEFAULT_BUTTONS
            })
            success++
          } catch (e) {}
        }

        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: `✅ تم الإرسال لـ ${success} دردشة`
        })
        return c.json({ ok: true })
      }
    }

    return c.json({ ok: true })
  } catch (error) {
    console.error('Error:', error)
    return c.json({ ok: false }, 500)
  }
})

export default app

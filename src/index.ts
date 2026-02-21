import { Hono } from 'hono'

type Bindings = {
  BROADCAST_BOT_TOKEN: string
  BROADCAST_ADMIN_ID: string
  GEMINI_API_KEY: string
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

async function fetchGeminiNews(geminiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
  
  const prompt = `أنت محرر أخبار متخصص في محافظة الدائر بني مالك في منطقة جازان بالسعودية.

ابحث في الإنترنت عن آخر أخبار محافظة الدائر بني مالك من آخر 24 ساعة واكتب تقرير احترافي بالعربية.

معايير الأخبار:
- يجب أن تتعلق بمحافظة الدائر بني مالك تحديداً (ليس جازان بشكل عام)
- أخبار محلية (مشاريع، فعاليات، إنجازات، أحداث)
- مصادر موثوقة فقط (صحف سعودية، حسابات رسمية)

التنسيق المطلوب:
📰 **تقرير أخبار الدائر بني مالك اليومي**

🗓️ التاريخ: ${new Date().toLocaleDateString('ar-SA')}

📋 **ملخص الأخبار:**
[ملخص شامل في 2-3 أسطر]

---

**الأخبار التفصيلية:**

1️⃣ **[عنوان الخبر الأول]**
📍 المصدر: [اسم المصدر]
🔗 الرابط: [رابط الخبر إن وُجد]
📝 التفاصيل: [ملخص الخبر في 3-4 أسطر]

2️⃣ **[عنوان الخبر الثاني]**
...

---

💡 **ملاحظة:** إذا لم تجد أخبار جديدة خلال آخر 24 ساعة، اذكر ذلك بوضوح.

الكلمات المفتاحية للبحث:
- "الدائر بني مالك"
- "محافظة الدائر"
- "الداير بني مالك"
- "محافظة الداير"

ملاحظة مهمة: ركز فقط على أخبار الدائر بني مالك. استبعد الأخبار العامة عن جازان إلا إذا كانت تتعلق بالدائر مباشرة.`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini error ${response.status}: ${error}`)
  }

  const data: any = await response.json()
  
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text
  }

  throw new Error('Invalid Gemini response')
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.json({
    status: 'online',
    bot: '@Dayersrfbot',
    message: 'بوت البث + Google Gemini AI',
    commands: ['/start', '/list', '/testnews'],
    powered_by: 'Gemini Pro'
  })
})

app.post('/webhook', async (c) => {
  try {
    const update = await c.req.json()
    const env = c.env
    
    const BOT_TOKEN = env.BROADCAST_BOT_TOKEN
    const ADMIN_ID = parseInt(env.BROADCAST_ADMIN_ID)
    const GEMINI_KEY = env.GEMINI_API_KEY

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
                `1️⃣ /testnews - جلب أخبار الدائر (Gemini AI)\n` +
                `2️⃣ /list - قائمة الدردشات\n` +
                `3️⃣ أرسل رسالة للبث\n\n` +
                `🤖 Powered by Google Gemini Pro`
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

      // اختبار Gemini
      if (msg.text === '/testnews' && chatType === 'private' && userId === ADMIN_ID) {
        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: '⏳ جاري جلب الأخبار من Gemini AI...\n\n🤖 Google Gemini Pro يبحث الآن...'
        })

        try {
          const newsReport = await fetchGeminiNews(GEMINI_KEY)
          
          // تقسيم الرسالة إذا كانت طويلة (Telegram limit: 4096 chars)
          if (newsReport.length > 4000) {
            const parts = newsReport.match(/[\s\S]{1,4000}/g) || [newsReport]
            for (const part of parts) {
              await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
                chat_id: chatId,
                text: part
              })
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          } else {
            await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
              chat_id: chatId,
              text: newsReport
            })
          }
          
          await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: `✅ تم جلب التقرير بنجاح!\n\n🤖 Powered by Google Gemini Pro`
          })
        } catch (error: any) {
          await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: `❌ خطأ في Gemini AI:\n\n${error.message}\n\nتحقق من:\n- صلاحية API Key\n- تفعيل Gemini API في Google Cloud`
          })
        }

        return c.json({ ok: true })
      }

      // /list
      if (msg.text === '/list' && chatType === 'private' && userId === ADMIN_ID) {
        let message = `📋 الدردشات المسجلة (${globalChats.length}):\n\n`
        globalChats.forEach((chat: any, i: number) => {
          const emoji = chat.type === 'channel' ? '📢' : 
                        chat.type === 'supergroup' || chat.type === 'group' ? '👥' : '💬'
          message += `${i + 1}. ${emoji} ${chat.title} (${chat.type})\n`
        })

        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: message || '📭 لا توجد دردشات مسجلة'
        })
        return c.json({ ok: true })
      }

      // بث رسالة
      if (chatType === 'private' && userId === ADMIN_ID && msg.text && !msg.text.startsWith('/')) {
        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: '⏳ جاري البث...'
        })

        let success = 0
        let failed = 0
        
        for (const chat of globalChats) {
          if (chat.type === 'private') continue
          
          try {
            await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
              chat_id: chat.id,
              text: msg.text,
              reply_markup: DEFAULT_BUTTONS
            })
            success++
          } catch (e) {
            failed++
          }
          
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        await sendTelegramMessage(BOT_TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: `✅ تم البث!\n\n📊 النتائج:\n✅ نجح: ${success}\n❌ فشل: ${failed}`
        })
        return c.json({ ok: true })
      }

      // my_chat_member
      if (update.my_chat_member) {
        const chat = update.my_chat_member.chat
        const newStatus = update.my_chat_member.new_chat_member.status

        if (newStatus === 'member' || newStatus === 'administrator') {
          if (!globalChats.find((c: any) => c.id === chat.id)) {
            globalChats.push({
              id: chat.id,
              type: chat.type,
              title: chat.title || 'Unknown',
              addedAt: new Date().toISOString()
            })
          }
        } else if (newStatus === 'left' || newStatus === 'kicked') {
          const index = globalChats.findIndex((c: any) => c.id === chat.id)
          if (index !== -1) {
            globalChats.splice(index, 1)
          }
        }
      }
    }

    return c.json({ ok: true })
  } catch (error) {
    console.error('Error:', error)
    return c.json({ ok: false }, 500)
  }
})

export default app

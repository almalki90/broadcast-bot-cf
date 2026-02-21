import { Hono } from 'hono'

// =====================================
// 🔐 إعدادات البوت
// =====================================
const BOT_TOKEN = '8327946629:AAG1U7M8f2OmW7GhlidJQRgVpzU6XUOjrpQ'
const ADMIN_ID = 8581434211

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
// ملاحظة: في الإنتاج، يُفضل استخدام KV أو D1
// لكن للبساطة سنستخدم memory مؤقتاً
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
  method: string,
  params: any
): Promise<any> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`
  
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
const app = new Hono()

// الصفحة الرئيسية
app.get('/', (c) => {
  return c.json({
    status: 'online',
    bot: '@Dayersrfbot',
    message: 'بوت البث يعمل على Cloudflare Workers'
  })
})

// معالجة webhook من Telegram
app.post('/webhook', async (c) => {
  try {
    const update = await c.req.json()
    const env = c.env

    // معالجة الرسالة
    if (update.message) {
      const msg = update.message
      const chatId = msg.chat.id
      const userId = msg.from.id
      const chatType = msg.chat.type

      // تحميل قائمة الدردشات
      let chats = await loadChats(env)

      // معالجة أمر /start
      if (msg.text === '/start') {
        // إضافة الدردشة للقائمة
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
          
          console.log(`✅ تم إضافة دردشة: ${chatInfo.title}`)
        }

        // رد حسب نوع الدردشة
        if (chatType === 'private') {
          if (userId === ADMIN_ID) {
            await sendTelegramMessage('sendMessage', {
              chat_id: chatId,
              text: 
                `👋 مرحباً أدمن!\n\n` +
                `🎯 استخدام البوت:\n\n` +
                `1️⃣ /broadcast - بث رسالة\n` +
                `2️⃣ /list - قائمة الدردشات\n` +
                `3️⃣ /stats - الإحصائيات\n` +
                `4️⃣ /help - المساعدة\n\n` +
                `📝 أو أرسل رسالة مباشرة لبثها!`
            })
          } else {
            await sendTelegramMessage('sendMessage', {
              chat_id: chatId,
              text:
                `🏔️ مرحباً بك في خدمات الدائر!\n\n` +
                `📍 دليلك الشامل لجميع الخدمات في محافظة الدائر\n\n` +
                `👇 اختر الخدمة التي تحتاجها:`,
              reply_markup: DEFAULT_BUTTONS
            })
          }
        } else if (chatType === 'group' || chatType === 'supergroup') {
          await sendTelegramMessage('sendMessage', {
            chat_id: chatId,
            text: `✅ تم تفعيل البوت في هذه المجموعة!`
          })
        }

        return c.json({ ok: true })
      }

      // معالجة أمر /list
      if (msg.text === '/list' && chatType === 'private') {
        if (userId !== ADMIN_ID) {
          await sendTelegramMessage('sendMessage', {
            chat_id: chatId,
            text: '⛔ هذا الأمر للأدمن فقط!'
          })
          return c.json({ ok: true })
        }

        if (chats.length === 0) {
          await sendTelegramMessage('sendMessage', {
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
          message += `   ID: ${chat.id}\n`
          message += `   النوع: ${chat.type}\n`
          if (chat.username) message += `   @${chat.username}\n`
          message += `\n`
        })

        await sendTelegramMessage('sendMessage', {
          chat_id: chatId,
          text: message
        })

        return c.json({ ok: true })
      }

      // معالجة أمر /stats
      if (msg.text === '/stats' && chatType === 'private') {
        if (userId !== ADMIN_ID) {
          await sendTelegramMessage('sendMessage', {
            chat_id: chatId,
            text: '⛔ هذا الأمر للأدمن فقط!'
          })
          return c.json({ ok: true })
        }

        const channels = chats.filter((c: any) => c.type === 'channel').length
        const groups = chats.filter((c: any) => c.type === 'group' || c.type === 'supergroup').length
        const privates = chats.filter((c: any) => c.type === 'private').length

        await sendTelegramMessage('sendMessage', {
          chat_id: chatId,
          text:
            `📊 إحصائيات البوت:\n\n` +
            `📢 قنوات: ${channels}\n` +
            `👥 مجموعات: ${groups}\n` +
            `💬 محادثات خاصة: ${privates}\n` +
            `📋 الإجمالي: ${chats.length}`
        })

        return c.json({ ok: true })
      }

      // معالجة أمر /help
      if (msg.text === '/help' && chatType === 'private') {
        const isAdmin = userId === ADMIN_ID

        let helpText = `📖 المساعدة:\n\n`

        if (isAdmin) {
          helpText +=
            `👑 أوامر الأدمن:\n\n` +
            `🔹 /broadcast <رسالة> - بث رسالة\n` +
            `🔹 /list - قائمة الدردشات\n` +
            `🔹 /stats - الإحصائيات\n` +
            `🔹 /help - المساعدة\n\n` +
            `📝 أرسل رسالة مباشرة لبثها تلقائياً!`
        } else {
          helpText +=
            `🤖 أنا بوت بث الرسائل.\n\n` +
            `📢 لاستخدامي:\n` +
            `1. أضفني لقناتك كمشرف\n` +
            `2. أو أضفني لمجموعتك\n` +
            `3. سأستقبل الرسائل من الأدمن`
        }

        await sendTelegramMessage('sendMessage', {
          chat_id: chatId,
          text: helpText
        })

        return c.json({ ok: true })
      }

      // بث الرسائل من الأدمن
      if (chatType === 'private' && userId === ADMIN_ID && !msg.text?.startsWith('/')) {
        if (msg.text) {
          // بث رسالة نصية
          await sendTelegramMessage('sendMessage', {
            chat_id: chatId,
            text: '⏳ جاري إرسال الرسالة...'
          })

          let successCount = 0
          let failedCount = 0

          for (const chat of chats) {
            if (chat.type === 'private') continue

            try {
              await sendTelegramMessage('sendMessage', {
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

          await sendTelegramMessage('sendMessage', {
            chat_id: chatId,
            text:
              `✅ تم إرسال الرسالة!\n\n` +
              `📊 النتائج:\n` +
              `✅ نجح: ${successCount}\n` +
              `❌ فشل: ${failedCount}`
          })
        } else if (msg.photo) {
          // بث صورة
          const photo = msg.photo[msg.photo.length - 1].file_id
          const caption = msg.caption || ''

          await sendTelegramMessage('sendMessage', {
            chat_id: chatId,
            text: '⏳ جاري إرسال الصورة...'
          })

          let successCount = 0
          let failedCount = 0

          for (const chat of chats) {
            if (chat.type === 'private') continue

            try {
              await sendTelegramMessage('sendPhoto', {
                chat_id: chat.id,
                photo: photo,
                caption: caption,
                reply_markup: DEFAULT_BUTTONS
              })
              successCount++
            } catch (error) {
              failedCount++
            }

            await new Promise(resolve => setTimeout(resolve, 100))
          }

          await sendTelegramMessage('sendMessage', {
            chat_id: chatId,
            text:
              `✅ تم إرسال الصورة!\n\n` +
              `📊 النتائج:\n` +
              `✅ نجح: ${successCount}\n` +
              `❌ فشل: ${failedCount}`
          })
        }

        return c.json({ ok: true })
      }

      // رد على المستخدمين العاديين
      if (chatType === 'private' && userId !== ADMIN_ID && !msg.text?.startsWith('/')) {
        await sendTelegramMessage('sendMessage', {
          chat_id: chatId,
          text:
            `🏔️ مرحباً بك في خدمات الدائر!\n\n` +
            `📍 دليلك الشامل لجميع الخدمات في محافظة الدائر\n\n` +
            `👇 اختر الخدمة التي تحتاجها:`,
          reply_markup: DEFAULT_BUTTONS
        })
        return c.json({ ok: true })
      }
    }

    // معالجة my_chat_member (إضافة/إزالة البوت)
    if (update.my_chat_member) {
      const chat = update.my_chat_member.chat
      const newStatus = update.my_chat_member.new_chat_member.status
      let chats = await loadChats(env)

      if (newStatus === 'member' || newStatus === 'administrator') {
        // تمت إضافة البوت
        if (!chats.find((c: any) => c.id === chat.id)) {
          const chatInfo = {
            id: chat.id,
            type: chat.type,
            title: chat.title || 'Unknown',
            username: chat.username || null,
            addedAt: new Date().toISOString()
          }
          
          chats.push(chatInfo)
          await saveChats(env, chats)
          
          console.log(`✅ تمت إضافة البوت لـ: ${chatInfo.title}`)
        }
      } else if (newStatus === 'left' || newStatus === 'kicked') {
        // تمت إزالة البوت
        const index = chats.findIndex((c: any) => c.id === chat.id)
        if (index !== -1) {
          chats.splice(index, 1)
          await saveChats(env, chats)
          
          console.log(`❌ تمت إزالة البوت من: ${chat.title}`)
        }
      }
    }

    return c.json({ ok: true })
  } catch (error) {
    console.error('❌ خطأ في معالجة الـ webhook:', error)
    return c.json({ ok: false, error: String(error) }, 500)
  }
})

export default app

// =====================================
// 📰 Daily News Script for GitHub Actions
// =====================================

const GROK_API_KEY = process.env.GROK_API_KEY
const BOT_TOKEN = process.env.BROADCAST_BOT_TOKEN
const ADMIN_ID = process.env.BROADCAST_ADMIN_ID

// =====================================
// 🤖 Grok API - جلب الأخبار
// =====================================
async function fetchDayerNews() {
  const url = 'https://api.x.ai/v1/chat/completions'
  
  const messages = [
    {
      role: 'system',
      content: `أنت محرر أخبار متخصص في محافظة الدائر بني مالك في منطقة جازان بالسعودية.

مهمتك:
1. البحث في الإنترنت عن آخر الأخبار الخاصة بمحافظة الدائر بني مالك فقط
2. جمع الأخبار من آخر 24 ساعة
3. كتابة تقرير احترافي بالعربية

معايير الأخبار:
- يجب أن تتعلق بمحافظة الدائر بني مالك تحديداً
- أخبار محلية (مشاريع، فعاليات، إنجازات، أحداث)
- مصادر موثوقة فقط

التنسيق المطلوب:
📰 **تقرير أخبار الدائر بني مالك اليومي**

🗓️ التاريخ: [التاريخ]

📋 **ملخص:**
[ملخص في 2-3 أسطر]

---

**الأخبار:**

1️⃣ **[عنوان]**
📍 المصدر: [المصدر]
🔗 [رابط]
📝 [التفاصيل]

---

💡 إذا لم تجد أخبار جديدة، اذكر ذلك.`
    },
    {
      role: 'user',
      content: `ابحث عن آخر أخبار محافظة الدائر بني مالك.

الكلمات المفتاحية:
- "الدائر بني مالك"
- "محافظة الدائر"
- "الداير بني مالك"

التاريخ: ${new Date().toLocaleDateString('ar-SA')}

ملاحظة: ركز فقط على أخبار الدائر بني مالك.`
    }
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content
  }

  throw new Error('Invalid Grok response')
}

// =====================================
// 📤 إرسال لـ Telegram
// =====================================
async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  })

  return await response.json()
}

// =====================================
// 🔄 Main
// =====================================
async function main() {
  console.log('⏰ بدء GitHub Action - جلب أخبار الدائر بني مالك')
  
  try {
    // جلب الأخبار من Grok
    console.log('🔍 جلب الأخبار من Grok AI...')
    const newsReport = await fetchDayerNews()
    
    console.log('✅ تم الحصول على التقرير')
    console.log('📰 التقرير:', newsReport.substring(0, 200) + '...')
    
    // إرسال للأدمن
    console.log('📤 إرسال للأدمن...')
    await sendToTelegram(ADMIN_ID, newsReport)
    
    console.log('✅ تم الإرسال بنجاح!')
    
    // إرسال تقرير النجاح
    await sendToTelegram(ADMIN_ID, 
      `✅ تم إرسال تقرير الأخبار اليومي\n\n` +
      `⏰ الوقت: ${new Date().toLocaleString('ar-SA')}\n` +
      `🤖 عبر GitHub Actions`
    )
    
  } catch (error) {
    console.error('❌ خطأ:', error)
    
    // إرسال تقرير الفشل
    await sendToTelegram(ADMIN_ID, 
      `❌ فشل GitHub Action\n\n` +
      `الخطأ: ${error.message}\n` +
      `⏰ الوقت: ${new Date().toLocaleString('ar-SA')}`
    )
    
    process.exit(1)
  }
}

main()

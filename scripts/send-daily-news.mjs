// Daily News Script
const GROK_API_KEY = process.env.GROK_API_KEY
const BOT_TOKEN = process.env.BROADCAST_BOT_TOKEN
const ADMIN_ID = process.env.BROADCAST_ADMIN_ID

async function fetchDayerNews() {
  const url = 'https://api.x.ai/v1/chat/completions'
  
  const requestBody = {
    messages: [
      {
        role: 'system',
        content: 'أنت محرر أخبار متخصص في محافظة الدائر بني مالك. ابحث في الإنترنت عن آخر الأخبار واكتب تقرير احترافي بالعربية.'
      },
      {
        role: 'user',
        content: `ابحث عن آخر أخبار محافظة الدائر بني مالك في آخر 24 ساعة.

الكلمات المفتاحية:
- "الدائر بني مالك"
- "الداير بني مالك"
- "محافظة الدائر"

التاريخ: ${new Date().toLocaleDateString('ar-SA')}

اكتب تقرير احترافي بالعربية مع:
- العنوان الرئيسي
- ملخص قصير
- الأخبار مع المصادر
- روابط المصادر

إذا لم تجد أخبار جديدة، اذكر ذلك.`
      }
    ],
    model: 'grok-2-latest',
    stream: false,
    temperature: 0
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`
    },
    body: JSON.stringify(requestBody)
  })

  const responseText = await response.text()
  
  if (!response.ok) {
    console.error('Grok API Response:', responseText)
    throw new Error(`Grok API error: ${response.status} - ${responseText}`)
  }

  const data = JSON.parse(responseText)
  
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content
  }

  throw new Error('Invalid Grok response structure')
}

async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  })

  return await response.json()
}

async function main() {
  console.log('⏰ بدء GitHub Action - جلب أخبار الدائر بني مالك')
  
  try {
    console.log('🔍 جلب الأخبار من Grok AI...')
    const newsReport = await fetchDayerNews()
    
    console.log('✅ تم الحصول على التقرير')
    console.log('📰 طول التقرير:', newsReport.length, 'حرف')
    
    console.log('📤 إرسال للأدمن...')
    const result = await sendToTelegram(ADMIN_ID, newsReport)
    
    if (result.ok) {
      console.log('✅ تم الإرسال بنجاح!')
      
      await sendToTelegram(ADMIN_ID, 
        `✅ تم إرسال تقرير الأخبار اليومي\n\n` +
        `⏰ الوقت: ${new Date().toLocaleString('ar-SA')}\n` +
        `🤖 عبر GitHub Actions`
      )
    } else {
      throw new Error(`Telegram error: ${JSON.stringify(result)}`)
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message)
    
    try {
      await sendToTelegram(ADMIN_ID, 
        `❌ فشل GitHub Action\n\n` +
        `الخطأ: ${error.message}\n` +
        `⏰ الوقت: ${new Date().toLocaleString('ar-SA')}`
      )
    } catch (e) {
      console.error('فشل إرسال تقرير الخطأ:', e)
    }
    
    process.exit(1)
  }
}

main()

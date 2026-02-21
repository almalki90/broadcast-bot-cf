// Daily News Script - Powered by Google Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const BOT_TOKEN = process.env.BROADCAST_BOT_TOKEN
const ADMIN_ID = process.env.BROADCAST_ADMIN_ID

async function fetchDayerNews() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
  
  const requestBody = {
    contents: [{
      parts: [{
        text: `أنت محرر أخبار محترف مختص بأخبار محافظة الدائر بني مالك في السعودية.
ابحث في الإنترنت عن آخر الأخبار والأحداث في محافظة الدائر بني مالك خلال الـ24 ساعة الماضية.

الكلمات المفتاحية:
- "الدائر بني مالك"
- "الداير بني مالك"
- "محافظة الدائر"
- "#الدائر"
- "#الداير"

التاريخ: ${new Date().toLocaleDateString('ar-SA')}

قدم تقرير إخباري احترافي بالعربية يحتوي على:
📰 عنوان رئيسي جذاب
📝 ملخص للأخبار المهمة (3-5 أخبار على الأقل)
🔗 روابط المصادر إن وجدت
✨ تنسيق جميل ومنظم بإيموجي

إذا لم تجد أخبار جديدة، اكتب تقرير عن الطقس أو معلومات عامة عن المحافظة.`
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const responseText = await response.text()
  
  if (!response.ok) {
    console.error('Gemini API Response:', responseText)
    throw new Error(`Gemini API error: ${response.status} - ${responseText}`)
  }

  const data = JSON.parse(responseText)
  
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text
  }

  throw new Error('Invalid Gemini response structure')
}

async function sendToTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  })

  return await response.json()
}

async function main() {
  console.log('⏰ بدء GitHub Action - جلب أخبار الدائر بني مالك')
  
  try {
    console.log('🔍 جلب الأخبار من Google Gemini AI...')
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
        `🤖 عبر GitHub Actions + Google Gemini AI`
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

// =====================================
// 🤖 Grok AI - جلب أخبار الدائر بني مالك
// =====================================

interface GrokMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function fetchDayerNews(grokApiKey: string): Promise<string> {
  const url = 'https://api.x.ai/v1/chat/completions'
  
  const messages: GrokMessage[] = [
    {
      role: 'system',
      content: `أنت محرر أخبار متخصص في محافظة الدائر بني مالك في منطقة جازان بالسعودية.
      
مهمتك:
1. البحث في الإنترنت عن آخر الأخبار الخاصة بمحافظة الدائر بني مالك فقط (ليس جازان بشكل عام)
2. جمع الأخبار من آخر 24 ساعة
3. كتابة تقرير احترافي بالعربية

معايير الأخبار:
- يجب أن تتعلق بمحافظة الدائر بني مالك تحديداً
- أخبار محلية (مشاريع، فعاليات، إنجازات، أحداث)
- مصادر موثوقة فقط (صحف سعودية، حسابات رسمية)

التنسيق المطلوب:
📰 **عنوان التقرير**

🗓️ التاريخ: [التاريخ الهجري والميلادي]

📋 **ملخص الأخبار:**
[ملخص شامل في 2-3 أسطر]

---

**الأخبار التفصيلية:**

1️⃣ **[عنوان الخبر الأول]**
📍 المصدر: [اسم المصدر]
🔗 الرابط: [رابط الخبر]
📝 التفاصيل: [ملخص الخبر في 3-4 أسطر]

2️⃣ **[عنوان الخبر الثاني]**
...

---

💡 **ملاحظة:** إذا لم تجد أخبار جديدة خلال آخر 24 ساعة، اذكر ذلك بوضوح.`
    },
    {
      role: 'user',
      content: `ابحث عن آخر أخبار محافظة الدائر بني مالك في آخر 24 ساعة واكتب تقرير احترافي.

استخدم هذه الكلمات في البحث:
- "الدائر بني مالك"
- "محافظة الدائر"
- "الداير بني مالك"
- "محافظة الداير"

التاريخ الحالي: ${new Date().toLocaleDateString('ar-SA')}

ملاحظة مهمة: 
- ركز فقط على أخبار محافظة الدائر بني مالك
- استبعد الأخبار العامة عن جازان إلا إذا كانت تتعلق بالدائر مباشرة
- إذا لم تجد أخبار جديدة، اذكر ذلك صراحة`
    }
  ]

  const requestBody = {
    model: 'grok-beta',
    messages: messages,
    temperature: 0.7,
    max_tokens: 2000
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grokApiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`)
    }

    const data: any = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content
    }

    throw new Error('Invalid Grok API response')
  } catch (error) {
    console.error('❌ خطأ في Grok API:', error)
    throw error
  }
}

// =====================================
// 📤 إرسال التقرير لجميع القنوات
// =====================================
export async function broadcastNewsReport(
  botToken: string,
  report: string,
  chats: any[]
): Promise<{ success: number; failed: number }> {
  let successCount = 0
  let failedCount = 0

  // إرسال فقط للقنوات والمجموعات (ليس المحادثات الخاصة)
  const targetChats = chats.filter(
    (chat: any) => chat.type === 'channel' || 
                   chat.type === 'group' || 
                   chat.type === 'supergroup'
  )

  for (const chat of targetChats) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat.id,
          text: report,
          parse_mode: 'Markdown'
        })
      })

      if (response.ok) {
        successCount++
        console.log(`✅ تم إرسال التقرير لـ: ${chat.title}`)
      } else {
        failedCount++
        console.error(`❌ فشل إرسال التقرير لـ: ${chat.title}`)
      }

      // تأخير بسيط لتجنب rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      failedCount++
      console.error(`❌ خطأ في إرسال التقرير لـ: ${chat.title}`, error)
    }
  }

  return { success: successCount, failed: failedCount }
}

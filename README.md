# 🤖 Broadcast Bot with Grok AI

## ✅ ما تم إنجازه:

### 1. البوت (@Dayersrfbot)
- ✅ منشور على Cloudflare Pages: https://broadcast-bot.pages.dev
- ✅ يعمل 24/7
- ✅ Webhook مفعل
- ✅ أوامر: /start, /list, /stats, /testnews

### 2. Grok AI Integration
- ✅ كود Grok جاهز في `src/grok-news.ts`
- ✅ API Key مضاف: `GROK_API_KEY`
- ✅ أمر `/testnews` لاختبار Grok مباشرة
- ⏰ Cron Job (يحتاج تفعيل يدوي)

## 🔧 المشكلة:

**Cloudflare Pages لا تدعم Cron Triggers!**

Cron Triggers تعمل فقط على **Cloudflare Workers**.

## ✅ الحلول المتاحة:

### الحل 1: تفعيل workers.dev (موصى به)
1. افتح: https://dash.cloudflare.com/5f934445bc1769e32fc9c5ca452bd89b/workers/onboarding
2. سجل subdomain مجاني (مثلاً: `your-name.workers.dev`)
3. بعد التسجيل، سأنشر البوت على Workers مع Cron

### الحل 2: استخدام GitHub Actions
- GitHub Actions تشغل Cron Job يومياً
- أقل موثوقية من Cloudflare
- لكن يعمل بدون تسجيل workers.dev

### الحل 3: يدوي (مؤقت)
- استخدم أمر `/testnews` في البوت
- سيجلب الأخبار من Grok ويرسلها

## 🚀 اختبار Grok الآن:

1. افتح البوت: https://t.me/Dayersrfbot
2. أرسل `/start`
3. أرسل `/testnews`
4. سيجلب آخر أخبار الدائر بني مالك!

## 📊 الميزات:

✅ Grok AI يبحث في الإنترنت
✅ تقرير احترافي بالعربية
✅ روابط المصادر
✅ تنسيق Markdown

---

**أي حل تفضل؟**

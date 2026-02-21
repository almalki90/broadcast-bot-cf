// Railway.app starter for Telegram bot
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.BROADCAST_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('✅ Bot started on Railway.app');

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Bot is running 24/7 on Railway! 🚀');
});

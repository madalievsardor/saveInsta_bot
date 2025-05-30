require('dotenv').config(); // .env faylini chaqirish

const { igdl } = require('btch-downloader');
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Express server — Render uxlab qolmasligi uchun
app.get('/', (req, res) => {
  res.send('🤖 Bot faol ishlayapti!');
});
app.listen(PORT, () => {
  console.log(`🌐 Web server ishlayapti: http://localhost:${PORT}`);
});

// Telegram botni ishga tushirish
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Video yuklab olish funksiyasi
async function downloadVideo(videoUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(videoUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Bot xabarlariga javob
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text;

  if (url === '/start') {
    return bot.sendMessage(chatId, '👋 *Salom!* Men Instagram videolarini yuklab beraman. 📹\n\nIltimos, Instagram video ssilkasini yuboring!', { parse_mode: 'Markdown' });
  }

  if (url === '/help') {
    return bot.sendMessage(chatId, '📋 *Yordam*\n\n1. Instagram video ssilkasini yuboring.\n2. Men uni yuklab, sizga yuboraman.\n\nMaslahat: Ssilka ommabop (public) bo‘lishi kerak!', { parse_mode: 'Markdown' });
  }

  if (!url.includes('instagram.com')) {
    return bot.sendMessage(chatId, '⚠️ *Xatolik*: Iltimos, Instagram video ssilkasini yuboring!\n\nMasalan: `https://www.instagram.com/reel/...`', { parse_mode: 'Markdown' });
  }

  try {
    await bot.sendMessage(chatId, '🎬 *Video yuklanishni boshladik!* ✨\nJarayon bir necha soniya davom etishi mumkin, sabr qiling!', { parse_mode: 'Markdown' });

    const cleanUrl = url.split('?')[0];
    const data = await igdl(cleanUrl);

    if (data && Array.isArray(data) && data[0] && data[0].url) {
      const videoUrl = data[0].url;
      await bot.sendMessage(chatId, '🎥 *Video topildi! ✅*\nTez orada siz uchun tayyorlanadi va yuboriladi!', { parse_mode: 'Markdown' });

      const outputPath = `./video-${Date.now()}.mp4`;
      await downloadVideo(videoUrl, outputPath);

      await bot.sendVideo(chatId, fs.createReadStream(outputPath), {
        caption: '📹 *Instagram videosi*',
        contentType: 'video/mp4',
        parse_mode: 'Markdown'
      });

      await bot.sendMessage(chatId, '✅ *Video muvaffaqiyatli yuborildi!*', { parse_mode: 'Markdown' });
      fs.unlinkSync(outputPath);
    } else {
      await bot.sendMessage(chatId, '❌ *Video topilmadi*\n\nSsilka ommabop (public) ekanligiga ishonch hosil qiling!', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Xato:', error.message);
    await bot.sendMessage(chatId, `🚨 *Xatolik yuz berdi*\n\n*Xato:* ${error.message}\n\nIltimos, ssilkani tekshirib qayta urinib ko‘ring!`, { parse_mode: 'Markdown' });
  }
});

// Render botni to‘xtatmasligi uchun
bot.on('polling_error', (error) => {
  console.log('Polling xatosi:', error.code);
});

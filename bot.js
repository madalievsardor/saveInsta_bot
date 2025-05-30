require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { igdl } = require('btch-downloader');
const fs = require('fs');
const https = require('https');

const app = express();
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { webHook: { port: process.env.PORT || 3000 } });

const URL = process.env.RENDER_EXTERNAL_URL; // Render URL: masalan, https://your-app-name.onrender.com
bot.setWebHook(`${URL}/bot${token}`);

app.use(express.json());

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

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

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '👋 Salom! Instagram video ssilkasini yuboring — men uni sizga yuboraman.');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text && text.includes('instagram.com')) {
    await bot.sendMessage(chatId, '⏳ Yuklanmoqda, iltimos kuting...');
    const cleanUrl = text.split('?')[0];

    try {
      const data = await igdl(cleanUrl);
      if (data && data[0] && data[0].url) {
        const videoUrl = data[0].url;
        const path = `video-${Date.now()}.mp4`;
        await downloadVideo(videoUrl, path);
        await bot.sendVideo(chatId, fs.createReadStream(path), {
          caption: '📹 Instagram videosi',
          parse_mode: 'Markdown'
        });
        fs.unlinkSync(path);
      } else {
        await bot.sendMessage(chatId, '❌ Video topilmadi. Public ekanligiga ishonch hosil qiling!');
      }
    } catch (e) {
      console.error(e.message);
      await bot.sendMessage(chatId, `❌ Xatolik: ${e.message}`);
    }
  }
});

app.get('/', (req, res) => {
  res.send('Bot ishlayapti!');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server ishga tushdi');
});

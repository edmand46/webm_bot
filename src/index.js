const Telegraf = require('telegraf');
const http = require('https');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const mongoose = require('mongoose');
const { dbUrl, dataFolder, limit, startMessage, time, token } = require('./config');

const User = mongoose.model('user', {
  first_name: String,
  username: String,
  telegramID: String,
  groupID: String,
  count: Number,
});


// Formats
const WEBM = '.webm';
const MP4 = '.mp4';

const bot = new Telegraf(token);
const telegram = bot.telegram;
const queue = [];

bot.start(ctx => ctx.reply(startMessage));

bot.command('set_channel', async (ctx) => {
  const { text, from: { id, first_name, username } } = ctx.message;

  try {
    const groupID = text.split(' ')[1];
    const dbUser = await User.findOne({ telegramID: id });
    if (dbUser === null) {
      await User.create({
        count: limit,
        groupID,
        telegramID: `${id}`,
        username,
        first_name,
      });

      await ctx.reply('channel successfully selected');
      return;
    }

    await dbUser.updateOne({ groupID });

    console.log(`selected channel ${groupID} by ${first_name} ${username}`);
    await ctx.reply('Channel successfully selected');
  } catch (e) {
    await ctx.reply('Failed select channel');
  }
});

const addQueue = async ctx => {
  const { from: { id } } = ctx;
  const dbUser = await User.findOne({ telegramID: id });

  if (dbUser === null && dbUser.groupID) {
    await ctx.reply('Channel not selected, select channel by command /set_channel @channel');
    return;
  }
  const message = ctx.message.text;
  const urls = message.match(/(http[\s\S]*?)\.(mp4|webm)/ig);
  const items = urls.map(url => ({ url, ctx }));
  queue.push(...items);
  await ctx.reply(`Added to queue ${items.length} items, total ${queue.length} items`);
};

bot.hears(/.webm/i, addQueue);
bot.hears(/.mp4/i, addQueue);

const downloadFile = (url, savePath) => new Promise((resolve, reject) => {
  console.log(`start download file ${path.basename(savePath)}`);
  const fileHandle = fs.createWriteStream(savePath);
  fileHandle.on('finish', () => {
    console.log('end download file');
    resolve();
  });
  http.get(url, respone => respone.pipe(fileHandle));
});

const convertFile = (file, output, progress) => new Promise((resolve, reject) => {
  ffmpeg(file)
    .format('mp4')
    .on('end', resolve)
    .on('progress', (p) => console.log(p.percent))
    .on('error', reject)
    .saveToFile(output);
});

const getFromQueue = async () => {
  console.log('get from queue');
  const item = queue.pop();
  const { url, ctx } = item;
  const { from: { id } } = ctx;

  await ctx.reply(`Started processing ${url}`);
  const fileName = path.basename(url);
  const pathToFile = `${dataFolder}/${fileName}`;
  const newFilename = `${path.parse(fileName).name}${MP4}`;
  const finalFilename = `${dataFolder}/${newFilename}`;
  try {
    const dbUser = await User.findOne({ telegramID: id });
    const channel = dbUser.groupID;
    await downloadFile(url, pathToFile);
    if (path.extname(url) === WEBM)
      await convertFile(pathToFile, finalFilename);

    const fileHandle = fs.readFileSync(finalFilename);

    console.log('upload to telegram');
    await telegram.sendVideo(channel, { source: fileHandle });
    fs.unlinkSync(finalFilename);
  } catch (e) {
    console.log(e);
    await ctx.reply(`Failed to download or convert ${url}`);
  }
};

const service = async () => {
  if (queue.length === 0) {
    await new Promise(resolve => setTimeout(resolve, time));
  } else {
    await getFromQueue();
  }
  await service();
};

const start = async () => {
  await mongoose.connect(dbUrl, { useNewUrlParser: true });

  if (!fs.existsSync(dataFolder))
    fs.mkdirSync(dataFolder);

  bot.startPolling();
  await service();
};


start().then(console.log).catch(console.error);

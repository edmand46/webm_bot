const Telegraf = require('telegraf');
const http = require('https');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const mongoose = require('mongoose');

const { dbUrl, dataFolder, limit, startMessage, time, token, maxFileSize } = require('./config');

const User = mongoose.model('user', {
  first_name: String,
  username: String,
  telegramID: String,
  groupID: String,
  mode: String,
  count: Number,
});

const CHANNEL_MODE = 'channel';
const CHAT_MODE = 'chat';

const WEBM = '.webm';
const MP4 = '.mp4';
const FLV = '.flv';

const supportedModes = [CHANNEL_MODE, CHAT_MODE];
const supportedFormats = [WEBM, MP4, FLV];
const convertibleFormats = [WEBM, MP4, FLV];

const bot = new Telegraf(token);
const telegram = bot.telegram;
const queue = [];

bot.start(ctx => ctx.reply(startMessage));

const setMode = async (ctx) => {
  const { text, from: { id, first_name, username } } = ctx.message;
  try {
    const mode = text.split(' ')[1];
    if (!supportedModes.includes(mode)) {
      await ctx.reply(`This mode not supported, use - [${supportedModes.join(',')}].`);
      return;
    }

    const dbUser = await User.findOne({ telegramID: id });
    if (dbUser === null) {
      await User.create({
        count: limit,
        mode,
        telegramID: `${id}`,
        groupID: '',
        username,
        first_name,
      });
    } else {
      await dbUser.updateOne({ mode });
    }

    console.log(`${first_name}(@${username}) select ${mode} mode`);
    await ctx.reply('Settings saved.');
  } catch (e) {
    console.error(e);
    await ctx.reply('Failed');
  }
};

const setChannel = async (ctx) => {
  const { text, from: { id, first_name, username } } = ctx.message;

  try {
    const groupID = text.split(' ')[1];
    const dbUser = await User.findOne({ telegramID: id });
    if (dbUser === null) {
      await User.create({
        count: limit,
        groupID,
        mode: CHANNEL_MODE,
        telegramID: `${id}`,
        username,
        first_name,
      });

      await ctx.reply('Settings saved.');
      return;
    }

    await dbUser.updateOne({ groupID });

    console.log(`selected channel ${groupID} by ${first_name} ${username}`);
    await ctx.reply('Channel successfully selected');
  } catch (e) {
    await ctx.reply('Failed select channel');
  }
};

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

const downloadFile = (url, savePath) => new Promise((resolve, reject) => {
  console.log(`Start download file ${path.basename(savePath)}`);
  const fileHandle = fs.createWriteStream(savePath);
  fileHandle.on('finish', () => {
    console.log('End download file');
    resolve();
  });
  http.get(url, respone => respone.pipe(fileHandle));
});

const readFile = filePath => new Promise((resolve, reject) => fs.readFile(filePath, ((err, data) => {
  if (err) reject(err);
  resolve(data);
})));

const convertFile = (file, output, fileInfo) => new Promise((resolve, reject) => {
  const task = ffmpeg(file);
  task.format('mp4')
    .addOutputOption('-vf', 'scale=w=400:h=400:force_original_aspect_ratio=2,crop=400:400')
    .on('end', resolve)
    .on('progress', (p) => console.log(p.percent))
    .on('error', reject)
    .saveToFile(output);
});

const getFileInfo = async (file) => new Promise((resolve, reject) => {
  ffmpeg.ffprobe(file, function (err, metadata) {
    if (err)
      reject(err);
    resolve(metadata);
  });
});

const getFromQueue = async () => {
  console.log(`get from queue[${queue.length}]`);

  const item = queue.shift();
  const { url, ctx } = item;
  const { from: { id, username } } = ctx;

  await ctx.reply(`Started processing ${url}`);
  const fileName = path.basename(url);
  const pathToFile = `${dataFolder}/${fileName}`;
  const newFilename = `${path.parse(fileName).name}${MP4}`;
  const finalFilename = `${dataFolder}/converted_${newFilename}`;

  try {
    const dbUser = await User.findOne({ telegramID: id });
    const channel = dbUser.groupID;
    const mode = dbUser.mode;

    await downloadFile(url, pathToFile);

    const extension = path.extname(url);
    if (convertibleFormats.includes(extension)) {
      const fileInfo = await getFileInfo(pathToFile);
      const { format: { size } } = fileInfo;

      const megabytes = size / (1024 * 1024);
      if (megabytes > maxFileSize) {
        fs.unlinkSync(finalFilename);
        ctx.reply(`File size to much!`);
        return;
      }

      await convertFile(pathToFile, finalFilename, fileInfo);
    }

    const file = await readFile(finalFilename);
    let chatID = -1;
    if (mode === CHAT_MODE)
      chatID = ctx.chat.id;
    if (mode === CHANNEL_MODE)
      chatID = channel;

    if (chatID === -1) {
      ctx.reply(`Mode not found ${mode}`);
      return;
    }
    console.log(`Upload to telegram video from ${username}`);
    await telegram.sendVideoNote(chatID, { source: file });
    // await telegram.sendVideo(chatID, { source: file });

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

  console.log('started');
  bot.startPolling();
  await service();
};


bot.command('set_mode', setMode);
bot.command('set_channel', setChannel);

supportedFormats.forEach(format => bot.hears(new RegExp(format, 'i'), addQueue));

start().then(console.log).catch(console.error);

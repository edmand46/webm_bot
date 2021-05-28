const {setupDB} = require("./db/connection");
const {MP4} = require('./constants');
const Telegraf = require('telegraf');
const fs = require('fs');
const {throttle} = require('lodash');
const path = require('path');
const {CHAT_MODE} = require("./constants");

const {
  dbUrl,
  dataFolder,
  startMessage,
  time,
  token,
  maxFileSize,
  convertibleFormats,
  supportedFormats
} = require('./config');
const {User} = require('./db/user.entity');
const {downloadFile, convertFile, getFileInfo, readFile} = require('./utils');
const commands = require('./commands');

const bot = new Telegraf(token);
const telegram = bot.telegram;
const queue = [];

const video = 'setModeVideo';
const videoNote = 'setVideoNote';
const actions = [video, videoNote];

const chooseFormat = Telegraf.Extra.markdown().markup(m => m.inlineKeyboard([
  m.callbackButton('Video', video),
  m.callbackButton('Video Note', videoNote)
]));

const selectFormat = async ctx => {
  const message = ctx.message.text;
  const urls = message.match(/(http[\s\S]*?)\.(mp4|webm|mov)/ig);
  if (!urls || urls.length === 0) return;

  const items = urls.map(url => ({url, ctx}));
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    await ctx.reply(`Select format for [${item.url}](${item.url})`, chooseFormat);
  }
};

const handleFormat = (format) => async ctx => {
  const {from: {id}, message: {text}} = ctx.update.callback_query;
  try {
    await ctx.editMessageReplyMarkup({reply_markup: {remove_keyboard: true}});
  } catch (e) {
    console.error(e);
  }
  await addQueue({id, message: text, format, ctx});
};

const addQueue = async ({id, message, format, ctx}) => {
  const urls = message.match(/(http[\s\S]*?)\.(mp4|webm)/ig);
  if (!urls || urls.length === 0) return;

  const items = urls.map(url => ({url, ctx, format}));
  queue.push(...items);
  await ctx.reply(`Added to queue ${items.length} items, total ${queue.length} items`);
};

const loggingProgress = ({chat_id, message_id, url}) => async (p) => {
  const percent = Math.floor(p);
  try {
    await telegram.editMessageText(chat_id, message_id, null, template.replace(URL, url).replace(PERCENT, percent));
  } catch (e) {
  }
};

const URL = '%url%';
const PERCENT = '%percent%';
const template = `Started processing ${URL} (${PERCENT}%)`;

const getFromQueue = async () => {
  console.log(`get from queue[${queue.length}]`);

  const item = queue.shift();
  const {url, ctx, format} = item;
  const {from: {id, username}} = ctx;

  const message = template.replace(URL, url).replace(PERCENT, 0);
  const {message_id, chat: {id: chat_id}} = await ctx.reply(message);

  const isVideoNote = format === videoNote;
  const fileName = path.basename(url);
  const pathToFile = `${dataFolder}/${fileName}`;
  const newFilename = `${path.parse(fileName).name}${MP4}`;
  const pathToFileConverted = `${dataFolder}/${new Date()}_${newFilename}`;

  try {
    let chatId = chat_id;

    const dbUser = await User.findOne({where: {telegramID: id}});
    if (dbUser) {
      const {mode, groupID} = dbUser;
      chatId = mode === CHAT_MODE ? ctx.chat.id : groupID;
    }

    await downloadFile(url, pathToFile);
    const log = loggingProgress({chat_id, message_id, url});


    const fileInfo = await getFileInfo(pathToFile);
    const {format: {size}} = fileInfo;

    const megabytes = size / (1024 * 1024);
    if (megabytes > maxFileSize) {
      ctx.reply(`File size to much!`);
      fs.unlinkSync(pathToFile);
      return;
    }

    await convertFile({
      input: pathToFile,
      output: pathToFileConverted,
      logging: throttle(log, 1000),
      resize: isVideoNote,
    });

    await log(100);

    const file = await readFile(pathToFileConverted);

    console.log(`Upload to telegram video from ${username}`);

    if (isVideoNote)
      await telegram.sendVideoNote(chatId, { source: file });
    else
      await telegram.sendVideo(chatId, { source: file });

    fs.unlinkSync(pathToFileConverted);
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
  await setupDB();

  if (!fs.existsSync(dataFolder))
    fs.mkdirSync(dataFolder);

  console.log('started');
  bot.startPolling();
  await service();
};

bot.start(ctx => ctx.reply(startMessage));

bot.on('document', async (ctx) => {
  const fileName = ctx.message.document.file_name;
  const fileFormats = supportedFormats.filter(format => {
    const regexp = new RegExp(format, 'i')
    return regexp.test(fileName);
  });

  if (fileFormats.length === 0) return;

  const fileId = ctx.message.document.file_id;
  const fileLink = await telegram.getFileLink(fileId);

  queue.push({url: fileLink, ctx, format: MP4});

  await ctx.reply(`Added to queue, total ${queue.length} items`);
});

commands(bot);

supportedFormats.forEach(format => bot.hears(new RegExp(format, 'i'), selectFormat));
actions.forEach(action => bot.action(action, handleFormat(action)));


start().then(console.log).catch(console.error);

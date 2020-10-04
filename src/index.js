
const { setupDB } = require("./db/connection");
const { MP4 } = require('./constants');
const Telegraf = require('telegraf');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { CHAT_MODE } = require("./constants");

const { dbUrl, dataFolder, startMessage, time, token, maxFileSize, convertibleFormats, supportedFormats } = require('./config');
const { User } = require('./db/connection');
const { downloadFile, convertFile, getFileInfo, readFile } = require('./utils');
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
  const urls = message.match(/(http[\s\S]*?)\.(mp4|webm)/ig);
  if (!urls || urls.length === 0) return;

  const items = urls.map(url => ({ url, ctx }));
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    await ctx.reply(`Select format for [${item.url}](${item.url})`, chooseFormat);
  }
};

const handleFormat = (format) => async ctx => {
  const { from: { id }, message: { text } } = ctx.update.callback_query;
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: { remove_keyboard: true } });
  } catch (e) {
    console.error(e);
  }
  await addQueue({ id, message: text, format, ctx });
};

const addQueue = async ({ id, message, format, ctx }) => {
  const dbUser = await User.findOne({ where: { telegramID: `${id}` } });

  if (dbUser === undefined || dbUser === null) {
    console.error(`User not found ${id}`);
    return
  }

  if (!dbUser.groupID) {
    await ctx.reply('Channel not selected, select channel by command /set_channel @channel');
    return;
  }

  const urls = message.match(/(http[\s\S]*?)\.(mp4|webm)/ig);
  if (!urls || urls.length === 0) return;

  const items = urls.map(url => ({ url, ctx, format }));
  queue.push(...items);
  await ctx.reply(`Added to queue ${items.length} items, total ${queue.length} items`);
};

const loggingProgress = ({ chat_id, message_id, url }) => async (p) => {
  const percent = Math.floor(p);
  await telegram.editMessageText(chat_id, message_id, null, template.replace(URL, url).replace(PERCENT, percent));
};

const URL = '%url%';
const PERCENT = '%percent%';
const template = `Started processing ${URL} (${PERCENT}%)`;

const getFromQueue = async () => {
  console.log(`get from queue[${queue.length}]`);

  const item = queue.shift();
  const { url, ctx, format } = item;
  const { from: { id, username } } = ctx;

  const message = template.replace(URL, url).replace(PERCENT, 0);
  const { message_id, chat: { id: chat_id } } = await ctx.reply(message);

  const isConverted = format === videoNote;
  const fileName = path.basename(url);
  const pathToFile = `${dataFolder}/${fileName}`;
  const newFilename = `${path.parse(fileName).name}${MP4}`;
  const finalFilename = isConverted ? `${dataFolder}/converted_${newFilename}` : `${dataFolder}/${newFilename}`;

  try {
    const dbUser = await User.findOne({ where: { telegramID: id } });
    const { mode, groupID } = dbUser;
    const chatID = mode === CHAT_MODE ? ctx.chat.id : groupID;
    await downloadFile(url, pathToFile);

    const extension = path.extname(url);
    if (convertibleFormats.includes(extension) || isConverted) {
      const fileInfo = await getFileInfo(pathToFile);
      const { format: { size } } = fileInfo;

      const megabytes = size / (1024 * 1024);
      if (megabytes > maxFileSize) {
        fs.unlinkSync(finalFilename);
        ctx.reply(`File size to much!`);
        return;
      }

      await convertFile({
        input: pathToFile,
        output: finalFilename,
        // logging: loggingThrottled({ chat_id, message_id, url }),
        resize: isConverted,
      });
    }

    const file = await readFile(finalFilename);
    console.log(`Upload to telegram video from ${username}`);

    if (isConverted)
      await telegram.sendVideoNote(chatID, { source: file });
    else
      await telegram.sendVideo(chatID, { source: file });

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
  await setupDB();

  if (!fs.existsSync(dataFolder))
    fs.mkdirSync(dataFolder);

  console.log('started');
  bot.startPolling();
  await service();
};

bot.start(ctx => ctx.reply(startMessage));

commands(bot);

supportedFormats.forEach(format => bot.hears(new RegExp(format, 'i'), selectFormat));
actions.forEach(action => bot.action(action, handleFormat(action)));

start().then(console.log).catch(console.error);

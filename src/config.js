require('dotenv').config();

const { CHANNEL_MODE, CHAT_MODE, WEBM, FLV, MP4 } = require('./constants');

const dbUrl = process.env['DATABASE_URL'];
const token = process.env['TOKEN'];
const dataFolder = process.env["DATA_FOLDER"];
const limit = process.env["LIMIT_PER_USER"];
const maxFileSize = process.env['MAX_FILE_SIZE'];
const contact = process.env['CONTACT'];
const time = 1000;

const supportedModes = [CHANNEL_MODE, CHAT_MODE];
const supportedFormats = [WEBM, MP4, FLV];
const convertibleFormats = [WEBM, FLV];

const startMessage = `
  Hello, this bot is for uploading webm, mp4 videos by link to channel.
  1) Add this bot as Admin to channel
  2) Set channel for publishing by command /set_channel @channel

  Author ${contact}`;

module.exports = {
  dbUrl,
  token,
  dataFolder,
  time,
  limit,
  startMessage,
  maxFileSize,
  supportedModes,
  supportedFormats,
  convertibleFormats
};
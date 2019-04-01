const dbUrl = 'mongodb://localhost/<db>';
const contact = '@edmand46';
const token = '<token>';
const dataFolder = 'data';
const time = 1000;
const limit = 20;
const maxFileSize = 10;

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
};
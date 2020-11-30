const fs = require('fs');
const path = require('path');
const http = require('https');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);

const downloadFile = (url, savePath) => new Promise((resolve, reject) => {
  console.log(`Start download file ${path.basename(savePath)}`);
  const fileHandle = fs.createWriteStream(savePath);
  fileHandle.on('finish', () => {
    console.log('End download file');
    resolve();
  });
  http.get(url, response => response.pipe(fileHandle));
});

const readFile = filePath => new Promise((resolve, reject) => fs.readFile(filePath, ((err, data) => {
  if (err) reject(err);
  resolve(data);
})));

const convertFile = (parameters) => new Promise((resolve, reject) => {
  const { input, output, logging, resize } = parameters;
  let task = ffmpeg(input).format('mp4');

  if (resize)
    task = task.addOutputOption('-vf', 'scale=w=400:h=400:force_original_aspect_ratio=2,crop=400:400');

  task.on('end', resolve)
    .on('progress', ({ percent }) => logging(percent))
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


module.exports = {
  downloadFile,
  readFile,
  convertFile,
  getFileInfo
};

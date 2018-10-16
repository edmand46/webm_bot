# Webm Bot
![png](images/logo.jpg)

## Overview
Telegram bot that receive links with video in formats(mp4|webm), download, convert if needed, and upload to telegram channel. 
### Requirements

* NodeJS >= 8
* Ubuntu
* MongoDB
* ffmpeg

### Setup

``` bash
# git clone https://github.com/Edisoni/webm_bot webm_bot
# cd webm_bot
# npm install
```

* Create telegram bot by [BotFather](https://telegram.me/botfather)
* Config app in ```src/config.js```
* Add this bot as Admin to channel
* Set your channel by command ```/set_channel @channel_name```
### Example
![png](images/example.png)

### Todo
* Queue limit 
* Check for identical links

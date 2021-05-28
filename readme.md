# WebM Bot
[![Build and deploy](https://github.com/edmand46/webm_bot/actions/workflows/deploy.yml/badge.svg)](https://github.com/edmand46/webm_bot/actions/workflows/deploy.yml)

![png](images/logo.jpg)

## Overview
Telegram bot that receives links with video in two formats(mp4|webm), downloads, converts if needed, and uploads to telegram channel as video messages.
 
### Requirements
* NodeJS >= 8
* Ubuntu >= 16.04

### Configuration

#### Mode
You can set "channel" or "chat" mode with command ```/set_mode <mode>```

![jpg](images/example1.jpg)

* chat - will send video directed you
* channel - will send video in your channel


#### Channel settings
For use this bot with channel mode you need to set channel 
1) Add this bot as Admin to your channel
2) Set your channel by command ```/set_channel @channel_name```
3) Set mode channel by command ```/set_mode channel```

### Setup via git

1) Create telegram bot by [BotFather](https://telegram.me/botfather)
3) Clone and set variables in .env file
``` bash
# git clone https://github.com/Edisoni/webm_bot webm_bot
# cd webm_bot
# npm install
# npm start
# mv .env-example .env
```

### Setup via Docker
1) Create telegram bot by [BotFather](https://telegram.me/botfather)
2) Create docker-compose.yml file
3) Create .env with next variables

.env
```dotenv
CONTACT=@edmand46
TOKEN=<token>
DATA_FOLDER=data
LIMIT_PER_USER=20
MAX_FILE_SIZE=10
```
docker-compose.yml
```dockerfile
version: '3.1'

services:
  backend:
    image: edmand46/webm_bot:latest
    restart: unless-stopped
    env_file: .env
    volumes:
      - "./data:/usr/src/app/data"
      - "./db:/usr/src/app/db"
```

### Screenshot
![png](images/example.png)

### Todo
* Queue limit 
* Check for identical links

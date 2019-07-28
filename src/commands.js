const { CHANNEL_MODE } = require('./constants');
const { limit, supportedModes } = require('./config');
const { User } = require('./model');

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
    const member = await ctx.telegram.getChatMember(groupID, id);
    const { status } = member;
    if (status !== 'creator') {
      await ctx.reply('You should be owner');
      return;
    }

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
    await ctx.reply('Settings saved.');
  } catch (e) {
    console.error(e);
    await ctx.reply('Failed select channel. Please use format /set_channel @channel_name');
  }
};

module.exports = bot => {
  bot.command('set_mode', setMode);
  bot.command('set_channel', setChannel);
};
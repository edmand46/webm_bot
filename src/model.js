const mongoose = require('mongoose');

const User = mongoose.model('user', {
  first_name: String,
  username: String,
  telegramID: String,
  groupID: String,
  mode: String,
  count: Number,
});

module.exports = { User };
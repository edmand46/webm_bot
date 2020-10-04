const { DataTypes } = require('sequelize');
const { sequelize } = require('./connection');

const User = sequelize.define('User', {
  firstName: {
    type: DataTypes.STRING,
  },
  lastName: {
    type: DataTypes.STRING
  },
  username: {
    type: DataTypes.STRING
  },
  telegramID: {
    type: DataTypes.STRING
  },
  groupID: {
    type: DataTypes.STRING
  },
  mode: {
    type: DataTypes.STRING
  },
  count: {
    type: DataTypes.NUMBER,
  }
}, {
  timestamps: true
});

module.exports = { User };

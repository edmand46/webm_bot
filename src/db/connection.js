const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'db/database.sqlite'
});

async function setupDB() {
  await sequelize.authenticate();
  await sequelize.sync() ;
}

module.exports = {
  sequelize,
  setupDB,
}


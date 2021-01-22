'use strict';

const fs = require("fs");

const languages = {
  "en": "English",
  "de": "German",
  "it": "Italian",
};

const LOCALE_PATH = '../../data/';

module.exports = async () => {
  const langParams = process.env.LOCALES || 'en,it'

  await langParams
    .split(',')
    .forEach(async code => {
      const locale = await strapi
        .query('locale')
        .findOne({ slug: code });

      const existFolderData = fs.existsSync(LOCALE_PATH);

      const data = existFolderData ? require(LOCALE_PATH + code + '.json') : {};

      if (locale) {
        console.info("Updating " + languages[code]);
        await strapi.query('locale').update(
          {
            id: locale.id
          },
          {
            name: languages[code],
            slug: code,
            ...data
          })
      } else {
        console.info("Generating " + languages[code]);
        await strapi.query('locale').create({
          name: languages[code],
          slug: code,
          ...data
        })
      }
    });

  const params = {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@company.com',
    blocked: false
  };

  const admins = await strapi
    .query('user', 'admin')
    .find({ _limit: 1 });

  if (admins.length) {
    console.log('Admin user created at first bootstrap');
  } else {
    params.password = await strapi.admin.services.auth.hashPassword(params.password);

    try {
      const admin = await strapi
        .query('user', 'admin')
        .create(params);

      console.info('(Admin) Account created:', admin);

    } catch (error) {
      console.error(error);
    }
  }
};

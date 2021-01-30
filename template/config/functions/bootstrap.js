'use strict';

const fs = require('fs');

const languages = {
  'en': 'English',
  'de': 'German',
  'it': 'Italian',
};

const DATA_PATH = './data/json';

const isArray = (value) => value && Object.prototype.toString.call(value) === '[object Array]';

const getDataFromPath = (path) => fs.existsSync(path) && require('../.' + path);

const getData = (model, code) => getDataFromPath(`${DATA_PATH}/${code}/${model}.json`);

const getGlobalData = (model) => getDataFromPath(`${DATA_PATH}/global/${model}.json`);

const getLocales = async (langCodes) => Promise.all(
  langCodes.map(async code => {
    const locale = await strapi
      .query('locale')
      .findOne({ slug: code });

    const data = getData('locale', code);

    if (data) {
      if (locale) {
        console.info('Updating locale: ' + code);
        await strapi.query('locale').update(
          {
            id: locale.id
          },
          {
            name: languages[code],
            slug: code,
            ...data
          });
        return locale;
      } else {
        console.info('Generating locale:' + code);
        return await strapi.query('locale').create({
          name: languages[code],
          slug: code,
          ...data
        });
      }
    } else {
      console.info('Missing data for locale: ' + code);
    }
  }));

module.exports = async () => {
  const langCodes = (process.env.LOCALES || 'en,it').split(',');

  console.log('Models...');

  const modelsKeys = Object
    .keys(strapi.models)
    .filter(k => !k.match(/core_store|strapi_webhooks|locale|message/));

  const locales = await getLocales(langCodes);

  const modelsUpdatesPromises = modelsKeys.map(
    async modelKey => {
      const entries = await strapi
        .query(modelKey)
        .find();

      const globalData = getGlobalData(modelKey);

      if (globalData) {
        if (isArray(globalData)) {
          const entriesToDelete = entries.filter(
            ({ slug }) => globalData.find(globalEntry => globalEntry.slug === slug) === undefined
          );

          const deletePromises = entriesToDelete.map(
            async ({ id }) => strapi.query(modelKey).delete({ id })
          );

          
          const promises = globalData.map(async globalEntry => {
            const entryToBeUpdated = entries.find(({ slug }) => slug === globalEntry.slug);
            
            if (entryToBeUpdated) {
              return strapi
                .query(modelKey)
                .update({ id: entryToBeUpdated.id }, globalEntry);
            }
            
            return strapi
              .query(modelKey)
              .create(globalEntry);
          });
          
          await Promise.all(deletePromises);
          
          console.info('Generating entries in model ' + modelKey);
          return Promise.all(promises);
        }
      }

      const modelUpdatesByLocales = locales.map(async locale => {
        const data = getData(modelKey, locale.slug);

        if (data) {
          const entriesByLocale = entries.filter(({ locale: entryLocale }) => entryLocale.slug === locale.slug);

          if (isArray(data)) {
            console.info('Generating global entries in model ' + modelKey + ' in locale ' + locale.slug);

            const updatesPromises = data.map(async globalEntry => {
              const entryToBeUpdated = entriesByLocale.find(({ slug }) => slug === globalEntry.slug);

              if (entryToBeUpdated) {
                return strapi
                  .query(modelKey)
                  .update({ id: entryToBeUpdated.id }, {
                    ...globalEntry,
                    locale: locale.id
                  });
              }

              return strapi
                .query(modelKey)
                .create({
                  ...globalEntry,
                  locale: locale.id
                });
            });

            return Promise.all(updatesPromises);
          }

          if (entriesByLocale.length > 0) {
            const [entryByLocale] = entriesByLocale;

            console.info('Updating: ' + modelKey + ' locale: ' + locale.slug);

            return strapi
              .query(modelKey)
              .update(
                { id: entryByLocale.id },
                {
                  ...data,
                  locale: locale.id
                }
              );
          }

          console.info('Creating: ' + modelKey + ' locale: ' + locale.slug);

          return strapi
            .query(modelKey)
            .create({
              ...data,
              locale: locale.id
            });
        }

        console.info('Missing data for model: ' + modelKey + ' locale: ' + locale.slug);
      });

      return Promise.all(modelUpdatesByLocales);
    }
  );

  await Promise.all(modelsUpdatesPromises);

  console.log('Admin...');

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

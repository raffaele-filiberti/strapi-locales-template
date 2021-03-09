'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.message.create(data, { files });
    } else {
      entity = await strapi.services.message.create(ctx.request.body);
    }
    entity = sanitizeEntity(entity, { model: strapi.models.message });

    const [config] = await strapi.query('config').find();
    const labels = await strapi.query('locale').find({ slug: entity.locale || 'en' });

    const thankYouTemplate = require('./thankYouTemplate.js');
    await strapi.plugins['email'].services.email.sendTemplatedEmail(
      {
        to: entity.email,
      },
      thankYouTemplate,
      {
        ...entity,
        ...((labels && labels.template) || {}),
        newMessageFrom: 'New Message from'
      }
    );
      
    if (config.sendTo.length > 0) {
      const template = require('./newMessageTemplate.js');
      await strapi.plugins['email'].services.email.sendTemplatedEmail(
        {
          to: config.sendTo.map(user => user.email).join(', '),
        },
        template,
        {
          ...entity,
          ...((labels && labels.template) || {}),
          newMessageFrom: 'New Message from'
        }
      );
    }

    return entity;
  },
};
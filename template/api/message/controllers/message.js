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

    const user = await strapi.query('user', 'admin').find()

    const customerUsers = user.filter(
      ({ roles }) => roles.find(
        ({ name }) => name.toLowerCase().includes('customer')
      ) !== undefined
    );

    if (customerUsers.length > 0) {
      await strapi.plugins['email'].services.email.send({
        to: customerUsers.map(user => user.email).join(', '),
        from: 'admin@strapi.io',
        subject: `Message from ${entity.name} ${entity.surname}`,
        text: `
        ID: #${entity.id}
        Name: ${entity.name}
        Surame: ${entity.surname}
        Email: ${entity.email}
        Comment:
        ${entity.content}
        `,
      });
    }

    return entity;
  },
};
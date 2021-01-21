'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/concepts/configurations.html#bootstrap
 */

module.exports = async () => {
  // Required fields:
  const params = {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'admin',
    email: process.env.ADMIN_EMAIL || 'your.email@company.com',
    blocked: false
  };

  // Check if exist any admin account - NOTE: you can change this query to find by specific email
  const admins = await strapi
    .query('administrator', 'admin')
    .find({ _limit: 1 });

  if (admins.length) {
    console.error('You can\'t register a new admin');
  } else {
    // Hash password before storing in the database
    params.password = await strapi.admin.services.auth.hashPassword(params.password);

    try {
      // Create admin account
      const admin = await strapi
        .query('administrator', 'admin')
        .create(params);

      console.info('(Admin) Account created:', admin);

    } catch (error) {
      console.error(error);
    }
  }
};

# Strapi application with GraphQL

1. Create a project using create-strapi-app 
```
npx create-strapi-app --template=https://github.com/raffaele-filiberti/strapi-locales-template.git [project name]
```
2. Add `DATABASE_URI` in `.env.example` file
3. Copy `.env.example` file and rename it in `.env`
4. Paste the following code in `config/database.js`: 
```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      settings: {
        uri: env('DATABASE_URI'),
      },
      options: {
        ssl: true
      },
    },
  },
});
```
5. Run `yarn develop`

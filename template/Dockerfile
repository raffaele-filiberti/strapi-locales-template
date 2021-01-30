FROM strapi/base:12-alpine as deps

WORKDIR /root

COPY ./package.json /root/

RUN yarn install



FROM node:12-alpine

WORKDIR /root

COPY . .

COPY --from=deps /root/node_modules /root/node_modules

ENV NODE_ENV=production

RUN yarn build

CMD ["yarn", "start"]
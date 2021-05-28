FROM node:14-alpine as build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

FROM node:14-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# copy from build image
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/node_modules ./node_modules

CMD [ "node", "src/index.js" ]

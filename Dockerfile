FROM node:16.13.1-alpine3.14

WORKDIR /usr/src/app

COPY ./client ./client

WORKDIR /usr/src/app/client

RUN npm install
# RUN npm --prefix ./client install ./client

RUN npm run build

RUN ls

# COPY ./client/build ./client/build

WORKDIR /usr/src/app

COPY [".env", "./"]

COPY ["server/package.json", "server/package-lock.json", "server/tsconfig.json", "./server/"]

COPY ./server/src ./server/src

WORKDIR /usr/src/app/server

RUN npm install

CMD npm run start


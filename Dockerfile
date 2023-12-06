FROM node:16.13.1-alpine3.14

WORKDIR /usr/src/app

COPY [".env", "package.json", "package-lock.json", "./"]

COPY ./client ./client

RUN npm --prefix ./client install ./client

# Builds client production version
RUN npm run build:client

COPY ["server/package.json", "server/package-lock.json", "server/tsconfig.json", "./server/"]

COPY ./server/src ./server/src

RUN npm install
RUN npm --prefix ./server install ./server

RUN npm run build:server

WORKDIR /usr/src/app/server

# Production server
CMD npm run start

# Development server
# CMD npm run dev


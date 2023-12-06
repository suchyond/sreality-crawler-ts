FROM node:16.13.1-alpine3.14

WORKDIR /usr/src/app

COPY [".env", "package.json", "package-lock.json", "./"]

COPY ./client ./client

# WORKDIR /usr/src/app/client

# RUN npm install
RUN npm --prefix ./client install ./client

# RUN npm run build
RUN npm run build:client

#RUN ls

# COPY ./client/build ./client/build

# WORKDIR /usr/src/app

COPY ["server/package.json", "server/package-lock.json", "server/tsconfig.json", "./server/"]

COPY ./server/src ./server/src

# WORKDIR /usr/src/app/server

RUN npm install
RUN npm --prefix ./server install ./server

# RUN npm run build
RUN npm run build:server
# COPY ./server/dist ./server/dist

WORKDIR /usr/src/app/server
# RUN npm run build

# RUN ls -a & sleep 15

# Production server
# CMD npm run start

# Development server
CMD npm run dev


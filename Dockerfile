FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]

LABEL org.opencontainers.image.source=https://github.com/madebymatthew/mcp-server-for-mc-hosting

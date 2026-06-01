FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev

COPY . .

RUN npm run build

RUN npm prune --omit=dev

CMD ["npm", "start"]

LABEL org.opencontainers.image.source=https://github.com/madebymatthew/mcp-server-for-mc-hosting

FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY src/ ./src/
COPY public/ ./public/

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

USER node

CMD ["node", "src/index.js"]

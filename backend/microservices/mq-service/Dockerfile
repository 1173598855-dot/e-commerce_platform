FROM node:20-alpine

WORKDIR /app

COPY mq-service/package*.json ./
RUN npm install --production

COPY mq-service/ ./mq-service/
COPY shared/ ./shared/

EXPOSE 4004

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4004/health || exit 1

CMD ["node", "mq-service/index.js"]

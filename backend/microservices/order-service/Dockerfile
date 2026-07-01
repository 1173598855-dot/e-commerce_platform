FROM node:20-alpine

WORKDIR /app

COPY order-service/package*.json ./
RUN npm ci --omit=dev

COPY order-service/ ./order-service/
COPY shared/ ./shared/

EXPOSE 4003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4003/health || exit 1

CMD ["node", "order-service/index.js"]

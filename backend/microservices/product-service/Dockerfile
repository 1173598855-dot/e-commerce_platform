FROM node:20-alpine

WORKDIR /app

COPY product-service/package*.json ./
RUN npm ci --omit=dev

COPY product-service/ ./product-service/
COPY shared/ ./shared/

EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4002/health || exit 1

CMD ["node", "product-service/index.js"]

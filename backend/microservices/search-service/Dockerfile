FROM node:20-alpine

WORKDIR /app

COPY search-service/package*.json ./
RUN npm ci --omit=dev

COPY search-service/ ./search-service/
COPY shared/ ./shared/

EXPOSE 4005

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4005/health || exit 1

CMD ["node", "search-service/index.js"]

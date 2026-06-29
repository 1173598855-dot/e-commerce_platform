FROM node:20-alpine

WORKDIR /app

COPY user-service/package*.json ./
RUN npm install --production

COPY user-service/ ./user-service/
COPY shared/ ./shared/

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4001/health || exit 1

CMD ["node", "user-service/index.js"]

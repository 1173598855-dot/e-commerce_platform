FROM node:20-alpine

WORKDIR /app

COPY auth-service/package*.json ./
RUN npm install --production

COPY auth-service/ ./auth-service/
COPY shared/ ./shared/

EXPOSE 4006

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4006/health || exit 1

CMD ["node", "auth-service/index.js"]

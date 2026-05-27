FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY server/ ./server/
COPY client/ ./client/

RUN mkdir -p server/uploads server/data

EXPOSE 8080

CMD ["node", "server/index.js"]

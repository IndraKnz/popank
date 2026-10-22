# Ever Tide — satu container untuk situs + relay multiplayer.
# Build: docker build -t ever-tide .
# Run:   docker run -p 8080:8080 ever-tide
FROM node:22-alpine

WORKDIR /app

# dependensi dulu (layer cache)
COPY package*.json ./
RUN npm ci

# sumber + build produksi
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# relay menyajikan dist/ sekaligus WebSocket /room
CMD ["node", "server/relay.js"]

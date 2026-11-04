FROM node:22-bookworm-slim

WORKDIR /app

# better-sqlite3 needs a compiler if no prebuilt binary matches.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Serves the production Vite build + Express API + realtime WebSocket.
CMD ["npm", "start"]

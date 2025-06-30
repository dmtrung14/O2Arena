# --- Stage 1: install deps ---
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Stage 2: copy source ---
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=deps /app/node_modules ./node_modules
COPY server ./server
COPY vercel.json ./vercel.json
EXPOSE 4000
CMD ["node", "server/index.js"] 
# --- deps stage: install only production dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Run as a non-root user rather than the default root.
RUN addgroup -S carepaws && adduser -S carepaws -G carepaws

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER carepaws

EXPOSE 5000
CMD ["node", "src/server.js"]

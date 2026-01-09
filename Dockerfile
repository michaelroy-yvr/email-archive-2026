# ---- frontend build ----
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- backend runtime ----
FROM node:20-alpine AS backend
WORKDIR /app/backend

# native deps needed for sharp / better-sqlite3 in alpine
RUN apk add --no-cache libc6-compat python3 make g++

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# copy frontend build into expected location
COPY --from=frontend /app/frontend/build /app/frontend/build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/app.js"]


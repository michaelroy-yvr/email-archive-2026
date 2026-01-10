# ---------- Frontend build ----------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend

# Install dependencies needed for npm packages
RUN apk add --no-cache python3 make g++

COPY frontend/package*.json ./
# Use npm install instead of npm ci for more flexibility
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build


# ---------- Backend runtime ----------
FROM node:20-alpine
WORKDIR /app/backend

# Needed for better-sqlite3 + sharp on alpine
RUN apk add --no-cache libc6-compat python3 make g++

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# Copy React build into a predictable location
COPY --from=frontend /app/frontend/build /app/frontend/build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/app.js"]


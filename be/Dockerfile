# ---------- BUILD STAGE ----------
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# ---------- RUNTIME STAGE ----------
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/build ./build

EXPOSE 4002

CMD ["node", "build/src/app.js"]

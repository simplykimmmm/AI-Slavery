FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
COPY prisma ./prisma
RUN npm install
RUN npm --prefix server install
COPY server ./server
RUN npm --prefix server run db:generate && npm --prefix server run build

FROM node:22-alpine
WORKDIR /app/server
ENV NODE_ENV=production
COPY --from=build /app/server/package*.json ./
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/prisma ../prisma
COPY --from=build /app/node_modules ../node_modules
EXPOSE 4000
CMD ["npm", "run", "start"]

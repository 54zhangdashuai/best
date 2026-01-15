FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Create data directory
RUN mkdir -p data

EXPOSE 3000

CMD ["npx", "ts-node", "src/server.ts"]

# enter_data/Dockerfile
FROM node:20.11.0

EXPOSE 5002
WORKDIR /app

COPY package.json package-lock.json ./
COPY views /app/views
RUN npm install

COPY . .

CMD ["node", "server.js"]


FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npx", "nodemon", "--legacy-watch", "main.js", "--host", "0.0.0.0", "--port", "3000", "--cache", "cache"]
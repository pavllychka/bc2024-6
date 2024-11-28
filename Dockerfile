FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npx", "nodemon", "--legacy-watch", "--inspect=0.0.0.0:9229", "main.js", "--host", "0.0.0.0", "--port", "3000", "--cache", "cache"]
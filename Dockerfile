FROM node:18-alpine

WORKDIR /app

# Copiar package.json de la raíz (que es el del server)
COPY package*.json ./
RUN npm install

# Copiar todo el código del server
COPY server/ ./

EXPOSE 3000

CMD ["npm", "start"]


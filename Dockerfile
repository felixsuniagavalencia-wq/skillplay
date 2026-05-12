FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar todo el código
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

EXPOSE 3000

# Iniciar el servidor con el código compilado
CMD ["npm", "start"]


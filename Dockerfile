FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código fuente (sin node_modules gracias al .dockerignore)
COPY . .

# Compilar TypeScript
RUN npx tsc -p server/tsconfig.json

EXPOSE 3000

CMD ["npm", "start"]
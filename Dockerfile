# Imagen base con Node 22
FROM node:22-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos primero manifiestos para cachear dependencias
COPY package*.json ./

# Instalamos dependencias de producción
RUN npm ci --omit=dev

# Copiamos el resto del código (incluye /model)
COPY . .

# El servicio escucha en 3003
EXPOSE 3003

# Comando de arranque
CMD ["node", "server.js"]
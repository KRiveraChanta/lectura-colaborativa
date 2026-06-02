# ==========================================
# ETAPA 1: Construir el Frontend (React/Vite)
# ==========================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copiar dependencias del frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copiar código fuente del frontend y construir
COPY frontend/ ./
RUN npm run build

# ==========================================
# ETAPA 2: Construir el Backend (Node/TypeScript)
# ==========================================
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Copiar dependencias del backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copiar código fuente del backend y compilar TypeScript
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npx tsc

# ==========================================
# ETAPA 3: Imagen Final de Producción
# ==========================================
FROM node:20-alpine

WORKDIR /app/backend

# Instalar solo dependencias de producción del backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copiar el backend compilado (JS)
COPY --from=backend-build /app/backend/dist ./dist

# Copiar el frontend compilado a la carpeta 'public' del backend
COPY --from=frontend-build /app/frontend/dist ./public

# Copiar imágenes del frontend público (hero images, etc.)
COPY frontend/public ./public/

# Crear directorio de uploads
RUN mkdir -p ./uploads

# Exponer el puerto del servidor
EXPOSE 5000

# Variables de entorno por defecto
ENV PORT=5000
ENV DB_HOST=localhost
ENV DB_PORT=3636
ENV DB_USER=root
ENV DB_PASS=1234
ENV DB_NAME=collab_reader

# Comando de inicio
CMD ["node", "dist/index.js"]

#!/bin/bash

# Entrar al directorio del proyecto
cd /DATA/AppData/lectura-colaborativa || exit

# Obtener los últimos cambios de master
git pull origin master

# Reconstruir y levantar los contenedores de Docker
echo "================================================="
echo "🚀 INICIANDO DESPLIEGUE AUTOMÁTICO DESDE GITHUB 🚀"
echo "================================================="
docker compose up -d --build
echo "✅ DESPLIEGUE FINALIZADO CORRECTAMENTE"

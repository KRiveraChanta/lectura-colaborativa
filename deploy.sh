#!/bin/bash

# Entrar al directorio del proyecto
cd /DATA/AppData/lectura-colaborativa || exit

# Obtener los últimos cambios de master
git pull origin master

# Reconstruir y levantar los contenedores de Docker
sudo docker compose up -d --build

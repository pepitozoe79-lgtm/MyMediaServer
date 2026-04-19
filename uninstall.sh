#!/bin/bash

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🗑️ Iniciando desinstalación de MyMediaServer...${NC}"

# 1. Detener y eliminar el servicio systemd
echo -e "${GREEN}🛑 Deteniendo y eliminando el servicio en segundo plano...${NC}"
sudo systemctl stop mymediaserver.service 2>/dev/null
sudo systemctl disable mymediaserver.service 2>/dev/null

if [ -f /etc/systemd/system/mymediaserver.service ]; then
    sudo rm -f /etc/systemd/system/mymediaserver.service
    sudo systemctl daemon-reload
    echo -e "${GREEN}✅ Servicio systemd del servidor eliminado correctamente.${NC}"
else
    echo -e "${YELLOW}⚠️ El servicio no estaba instalado en este sistema.${NC}"
fi

# 2. Cerrar puerto del firewall
read -p "¿Deseas eliminar la regla del puerto 3000 en el firewall (UFW)? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    sudo ufw delete allow 3000/tcp 2>/dev/null
    echo -e "${GREEN}✅ Regla del puerto 3000 revocada en el firewall.${NC}"
fi

echo -e "${YELLOW}⚠️ Nota permanente: Este script no borró tus archivos ni tus películas.${NC}"
echo -e "Si deseas eliminar completamente el código fuente, borra la carpeta donde clonaste MyMediaServer (ej: 'rm -rf MyMediaServer')."
echo -e "${GREEN}🎉 ¡Sistema limpiado exitosamente!${NC}"

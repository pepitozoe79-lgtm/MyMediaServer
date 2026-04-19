#!/bin/bash

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Iniciando instalación de MyMediaServer...${NC}"

# 1. Actualizar el sistema
echo -e "${GREEN}📦 Actualizando paquetes del sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias básicas
echo -e "${GREEN}🔧 Instalando curl y git...${NC}"
sudo apt install -y curl git

# 3. Instalar Node.js 20.x (LTS)
echo -e "${GREEN}⬢ Instalando Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versiones
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# 4. Instalar dependencias del proyecto
echo -e "${GREEN}📚 Instalando módulos npm del proyecto...${NC}"
# Limpiar instalaciones previas para evitar error idealTree de NPM
rm -rf node_modules package-lock.json
npm install --production

# 5. Crear archivo de servicio systemd
echo -e "${GREEN}⚙️ Configurando servicio systemd para MyMediaServer...${NC}"
SERVICE_FILE="/etc/systemd/system/mymediaserver.service"
CURRENT_DIR=$(pwd)
USER=$(whoami)

sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=MyMediaServer - Servidor Multimedia Personal
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/node $CURRENT_DIR/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd y habilitar el servicio
sudo systemctl daemon-reload
sudo systemctl enable mymediaserver.service
sudo systemctl start mymediaserver.service

# 6. Configurar firewall (opcional)
if command -v ufw > /dev/null; then
    echo -e "${YELLOW}🛡️  Configurando Firewall...${NC}"
    sudo ufw allow 3000/tcp
    echo -e "${GREEN}✅ Puerto 3000 abierto.${NC}"
fi

# 7. Obtener IP del servidor
IP=$(hostname -I | awk '{print $1}')

echo -e "${YELLOW}🎉 ¡Instalación completada!${NC}"
echo -e "${GREEN}🌐 Accede a MyMediaServer desde: http://$IP:3000${NC}"
echo -e "${GREEN}🔑 Usuario: admin / Contraseña: admin123${NC}"
echo -e "${GREEN}🛠️  Comandos útiles:${NC}"
echo "   sudo systemctl status mymediaserver  # Ver estado"
echo "   sudo systemctl restart mymediaserver # Reiniciar"
echo "   sudo journalctl -u mymediaserver -f  # Ver logs en tiempo real"

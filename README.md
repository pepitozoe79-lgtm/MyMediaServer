<p align="center">
  <img src="https://raw.githubusercontent.com/pepitozoe79-lgtm/MyMediaServer/main/public/favicon.ico" width="100" alt="MyMediaServer Logo" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Tv-icon-32px.png/120px-Tv-icon-32px.png'">
</p>

<h1 align="center">📺 MyMediaServer</h1>

<p align="center">
  <strong>Un Servidor Multimedia Autocontenido, Rápido y Personalizable basado en Node.js</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versi%C3%B3n-1.0.0-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Node.js-18.x-green.svg?style=flat-square" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-orange.svg?style=flat-square" alt="License">
</p>

---

## 📖 Acerca del Proyecto

**MyMediaServer** es una solución ligera y potente para alojar, gestionar y reproducir tu contenido multimedia local y listas IPTV directamente desde el navegador. Diseñado con una interfaz moderna y fluida, elimina la necesidad de configuraciones complicadas. Todo funciona desde un único servidor Node.js sin depender de bases de datos externas.

Ideal para montar un cine en casa usando una Raspberry Pi, un servidor Windows o cualquier sistema con Node.js instalado.

---

## ✨ Características Principales

*   🎬 **Streaming Integrado**: Reproductor HTML5 avanzado con soporte para reanudación de video (guarda tu progreso) y soporte para _Byte-Range_ (adelantar/atrasar limpiamente).
*   🛰️ **Televisión en Vivo (IPTV)**: Soporte integrado para cargar listas M3U/M3U8. Analiza y muestra los logos y nombres de los canales automáticamente.
*   📁 **Gestor de Archivos Completo**: Sube tus películas, series o música, crea carpetas, renombra o elimina archivos directamente desde el panel web.
*   🔐 **Sistema de Usuarios y Roles**: Panel de administración accesible solo para `admin`, permitiendo crear distintos usuarios y proteger la privacidad de tu biblioteca.
*   💬 **Subtítulos Inteligentes**: Si añades un archivo `.srt` con el mismo nombre que tu película, el reproductor web lo cargará automáticamente en pantalla.

---

## 🚀 Instalación y Uso

### Opción A: Instalación Manual (Windows, macOS, Linux)
Solo necesitas tener `Node.js` instalado en tu sistema.

#### 1. Clonar el Repositorio
Abre tu terminal y clona este proyecto:
```bash
git clone https://github.com/pepitozoe79-lgtm/MyMediaServer.git
cd MyMediaServer
```

#### 2. Instalar Dependencias
Instala los paquetes necesarios del proyecto:
```bash
npm install
```

#### 3. Iniciar el Servidor
Inicia la aplicación:
```bash
npm start
```
*También puedes usar `npm run dev` si estás modificando el código y quieres que se reinicie solo al guardar cambios.*

#### 4. Acceder
Abre tu navegador y ve a:
```
http://localhost:3000
```
> **Credenciales por defecto:**
> **Usuario:** `admin`
> **Contraseña:** `admin123`

*(Te recomendamos cambiar las credenciales o crear un nuevo usuario administrador desde el Panel de Control una vez ingreses).*

---

### Opción B: Despliegue Automatizado (Debian / Ubuntu)
Para entornos de producción o VPS (Debian 12/13, Ubuntu Server), puedes instalar, descargar y configurar todo el proyecto de manera automática con un **solo comando** (al más puro estilo CasaOS). Este comando descargará Node.js, instalará las dependencias y dejará un servicio `systemd` corriendo 24/7.

Abre la terminal de tu servidor y ejecuta:

```bash
curl -fsSL https://raw.githubusercontent.com/pepitozoe79-lgtm/MyMediaServer/main/install.sh | sudo bash
```

El script se encargará de todo y al concluir te mostrará la IP en la que el puerto `3000` está escuchando. Te proporcionará también comandos útiles de `systemctl` para gestionar el servicio en el futuro.

### Desinstalación Automática
De forma tan simple como se instala, si alguna vez necesitas detener, desenlazar permanentemente del sistema (`systemd`) y limpiar las reglas de tu servidor, solo ejecuta:
```bash
curl -fsSL https://raw.githubusercontent.com/pepitozoe79-lgtm/MyMediaServer/main/uninstall.sh | sudo bash
```
*(Nota: Tratar a tus archivos es sagrado. Este comando **no eliminará tus películas ni tus configuraciones privadas**, solo cortará el servidor en la memoria base).*

---

## 📂 Estructura de Directorios

Al ejecutarse por primera vez, el servidor creará la estructura de carpetas automáticamente:

```text
MyMediaServer/
├── media/               # 📁 Directorio principal donde va tu contenido
│   ├── Peliculas/       # Guarda tus películas aquí. Soporta buscar imagen "poster.jpg" o "cover.jpg"
│   ├── Series/          # Organiza tus temporadas. 
│   └── Musica/          
├── public/              # Archivos estáticos del Frontend (HTML, CSS, JS)
├── users.json           # 🔑 (Autogenerado) Base de datos de acceso de usuarios
├── iptv.json            # 🛰️ (Autogenerado) URL de tu lista M3U actual
├── server.js            # Lógica y API del servidor Backend
└── package.json         # Dependencias del proyecto
```

---

## 🎨 Personalizando las Portadas

Para que rinda visualmente con un aspecto de "Netflix", simplemente coloca una imagen dentro de la carpeta de una serie o junto al video con uno de los siguientes nombres:
- `poster.jpg` / `poster.png`
- `cover.jpg`
- `folder.jpg`

El servidor escaneará automáticamente estas imágenes y las usará como miniaturas en la cuadrícula de navegación.

---

<p align="center">
  Hecho con ❤️ para la comunidad de <strong>Home Servers</strong>.
</p>

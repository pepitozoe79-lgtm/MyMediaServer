const express = require('express');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Rutas absolutas compatibles con todos los SO
const MEDIA_FOLDER = path.join(__dirname, 'media');
const USERS_FILE = path.join(__dirname, 'users.json');
const IPTV_FILE = path.join(__dirname, 'iptv.json');

// ==============================================
// 📂 INICIALIZACIÓN AUTOMÁTICA DE CARPETAS
// ==============================================
function initializeApp() {
    if (!fs.existsSync(MEDIA_FOLDER)) {
        fs.mkdirSync(MEDIA_FOLDER, { recursive: true });
        console.log('✅ Carpeta "media" creada.');
    }
    // Subcarpetas por defecto
    ['Peliculas', 'Series', 'Musica'].forEach(folder => {
        const folderPath = path.join(MEDIA_FOLDER, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
            console.log(`✅ Carpeta "${folder}" creada.`);
        }
    });
    // Usuario admin por defecto
    if (!fs.existsSync(USERS_FILE)) {
        const defaultUsers = [{
            id: 1,
            username: "admin",
            password: bcrypt.hashSync("admin123", 10),
            role: "admin",
            name: "Administrador"
        }];
        fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        console.log('✅ Usuario "admin" creado (contraseña: admin123).');
    }
}
initializeApp();

// ==============================================
// MIDDLEWARES
// ==============================================
app.use(express.static('public'));        // Sirve el frontend
app.use('/media', express.static(MEDIA_FOLDER)); // Sirve imágenes/posters
app.use(express.json());
app.use(fileUpload());

// ==============================================
// AUTENTICACIÓN
// ==============================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

    bcrypt.compare(password, user.password, (err, match) => {
        if (match) {
            const { password, ...safeUser } = user;
            res.json({ success: true, user: safeUser });
        } else {
            res.status(400).json({ error: 'Contraseña incorrecta' });
        }
    });
});

// ==============================================
// GESTIÓN DE USUARIOS (ADMIN)
// ==============================================
app.get('/api/users', (req, res) => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')).map(u => {
        const { password, ...rest } = u;
        return rest;
    });
    res.json(users);
});

app.post('/api/users', (req, res) => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const newUser = {
        id: Date.now(),
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, 10),
        role: req.body.role,
        name: req.body.name
    };
    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ success: true });
});

app.delete('/api/users/:id', (req, res) => {
    let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    users = users.filter(u => u.id != req.params.id);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ success: true });
});

// ==============================================
// ESCANEO DE BIBLIOTECA (Carátulas y Subtítulos)
// ==============================================
app.get('/api/browse', (req, res) => {
    const dirPath = req.query.path ? decodeURIComponent(req.query.path) : MEDIA_FOLDER;
    scanDirectory(dirPath, (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(items);
    });
});

function scanDirectory(dir, done) {
    fs.readdir(dir, { withFileTypes: true }, (err, list) => {
        if (err) return done(err);
        let pending = list.length;
        if (!pending) return done(null, []);
        let results = [];

        list.forEach(item => {
            const fullPath = path.join(dir, item.name);
            const relPath = path.relative(MEDIA_FOLDER, fullPath).replace(/\\/g, '/');

            fs.stat(fullPath, (err, stat) => {
                if (stat.isDirectory()) {
                    const poster = checkPoster(fullPath);
                    results.push({
                        name: item.name,
                        type: 'folder',
                        path: fullPath,
                        poster: poster ? `/media/${relPath}/${poster}` : null
                    });
                    if (!--pending) done(null, results);
                } else {
                    if (isVideoFile(item.name)) {
                        const baseName = path.parse(item.name).name;
                        const parentDir = path.dirname(fullPath);
                        const parentRel = path.relative(MEDIA_FOLDER, parentDir).replace(/\\/g, '/');
                        const poster = checkPoster(parentDir);
                        const hasSubtitles = fs.existsSync(path.join(parentDir, baseName + '.srt'));
                        
                        results.push({
                            name: baseName,
                            type: 'video',
                            path: fullPath,
                            poster: poster ? `/media/${parentRel}/${poster}` : null,
                            hasSubtitles: hasSubtitles
                        });
                    }
                    if (!--pending) done(null, results);
                }
            });
        });
    });
}

function checkPoster(folder) {
    const possible = ['poster.jpg', 'poster.png', 'folder.jpg', 'cover.jpg'];
    for (const name of possible) {
        if (fs.existsSync(path.join(folder, name))) return name;
    }
    return null;
}

function isVideoFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.mpg', '.mpeg', '.webm'].includes(ext);
}

// ==============================================
// STREAMING DE VIDEO (Soporte Range)
// ==============================================
app.get('/stream', (req, res) => {
    const filePath = decodeURIComponent(req.query.path);
    if (!filePath.startsWith(MEDIA_FOLDER)) return res.status(403).send('Acceso denegado');
    
    fs.stat(filePath, (err, stats) => {
        if (err) return res.status(404).send('Archivo no encontrado');
        
        const range = req.headers.range;
        const fileSize = stats.size;
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.mkv': 'video/x-matroska',
            '.webm': 'video/webm'
        };
        const contentType = mimeTypes[ext] || 'video/mp4';

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': contentType,
            });
            fs.createReadStream(filePath).pipe(res);
        }
    });
});

// ==============================================
// SUBTÍTULOS
// ==============================================
app.get('/subs', (req, res) => {
    const videoPath = decodeURIComponent(req.query.path);
    if (!videoPath.startsWith(MEDIA_FOLDER)) return res.status(403).send('Acceso denegado');
    
    const srtPath = videoPath.replace(path.extname(videoPath), '.srt');
    if (fs.existsSync(srtPath)) {
        res.sendFile(srtPath);
    } else {
        res.status(404).send('Subtítulo no encontrado');
    }
});

// ==============================================
// GESTOR DE ARCHIVOS (FILE MANAGER)
// ==============================================
app.get('/api/files', (req, res) => {
    const dirPath = req.query.path ? decodeURIComponent(req.query.path) : MEDIA_FOLDER;
    if (!dirPath.startsWith(MEDIA_FOLDER)) return res.status(403).send('Acceso denegado');
    
    fs.readdir(dirPath, { withFileTypes: true }, (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const result = items.map(item => {
            const fullPath = path.join(dirPath, item.name);
            let size = '--';
            if (!item.isDirectory()) {
                try { size = formatSize(fs.statSync(fullPath).size); } catch(e) {}
            }
            return {
                name: item.name,
                type: item.isDirectory() ? 'folder' : 'file',
                path: fullPath,
                size: size
            };
        });
        res.json(result);
    });
});

app.post('/api/upload', (req, res) => {
    const dest = req.body.path ? decodeURIComponent(req.body.path) : MEDIA_FOLDER;
    if (!dest.startsWith(MEDIA_FOLDER)) return res.status(403).send('Acceso denegado');
    if (!req.files || !req.files.file) return res.status(400).send('No se subió ningún archivo');
    
    const file = req.files.file;
    const uploadPath = path.join(dest, file.name);
    
    file.mv(uploadPath, (err) => {
        if (err) return res.status(500).send(err.message);
        res.send('Archivo subido correctamente');
    });
});

app.delete('/api/delete', (req, res) => {
    const filePath = decodeURIComponent(req.body.path);
    if (!filePath.startsWith(MEDIA_FOLDER)) return res.status(403).send('Acceso denegado');
    
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.put('/api/rename', (req, res) => {
    const { oldPath, newName } = req.body;
    const oldPathDecoded = decodeURIComponent(oldPath);
    if (!oldPathDecoded.startsWith(MEDIA_FOLDER)) return res.status(403).send('Acceso denegado');
    
    const dir = path.dirname(oldPathDecoded);
    const newPath = path.join(dir, newName);
    const oldExt = path.extname(oldPathDecoded);
    
    fs.rename(oldPathDecoded, newPath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Renombrar subtítulo asociado si existe
        if (isVideoFile(oldPathDecoded)) {
            const oldBase = path.basename(oldPathDecoded, oldExt);
            const newBase = path.basename(newPath, path.extname(newPath));
            const oldSrt = path.join(dir, oldBase + '.srt');
            const newSrt = path.join(dir, newBase + '.srt');
            if (fs.existsSync(oldSrt)) {
                fs.rename(oldSrt, newSrt, () => {});
            }
        }
        res.json({ success: true });
    });
});

// ==============================================
// IPTV
// ==============================================
app.post('/api/iptv/config', (req, res) => {
    const { url } = req.body;
    fs.writeFileSync(IPTV_FILE, JSON.stringify({ url }, null, 2));
    res.json({ success: true });
});

app.get('/api/iptv/channels', (req, res) => {
    if (!fs.existsSync(IPTV_FILE)) return res.json({ channels: [] });
    
    const config = JSON.parse(fs.readFileSync(IPTV_FILE, 'utf8'));
    const listUrl = config.url;
    
    if (listUrl.startsWith('http')) {
        const lib = listUrl.startsWith('https') ? require('https') : require('http');
        lib.get(listUrl, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                res.json({ channels: parseM3U(data) });
            });
        }).on('error', (err) => {
            res.status(500).json({ error: err.message });
        });
    } else {
        // Asumimos ruta local
        if (fs.existsSync(listUrl)) {
            const content = fs.readFileSync(listUrl, 'utf8');
            res.json({ channels: parseM3U(content) });
        } else {
            res.status(404).json({ error: 'Archivo M3U no encontrado' });
        }
    }
});

function parseM3U(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};
    
    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            const nameMatch = line.match(/,(.*)$/);
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            currentChannel.name = nameMatch ? nameMatch[1] : 'Canal sin nombre';
            currentChannel.logo = logoMatch ? logoMatch[1] : 'https://via.placeholder.com/40/1a1a2e/ffffff?text=TV';
        } else if (line && !line.startsWith('#')) {
            currentChannel.url = line;
            channels.push({ ...currentChannel });
            currentChannel = {};
        }
    });
    return channels;
}

// ==============================================
// UTILIDADES
// ==============================================
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==============================================
// INICIAR SERVIDOR
// ==============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MyMediaServer activo en http://localhost:${PORT}`);
    console.log(`📂 Carpeta multimedia: ${MEDIA_FOLDER}`);
    console.log(`🔑 Usuario por defecto: admin / admin123`);
    console.log(`💡 Accede desde cualquier dispositivo en tu red local usando tu IP.`);
});

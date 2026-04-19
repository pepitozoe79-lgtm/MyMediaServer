// Variables globales
let currentUser = null;
let navigationHistory = [];
let currentPath = null;
let isExplorerView = false;
let currentExplorerPath = null;
let allItems = [];
let currentVideoId = null;

// Elementos del DOM
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const mediaHomeSection = document.getElementById('mediaHomeSection');
const mediaGrid = document.getElementById('mediaGrid');
const continueWatchingWrapper = document.getElementById('continueWatchingWrapper');
const continueGrid = document.getElementById('continueGrid');
const fileManager = document.getElementById('fileManager');
const iptvSection = document.getElementById('iptvSection');
const adminPanel = document.getElementById('adminPanel');
const modal = document.getElementById('playerModal');
const videoPlayer = document.getElementById('videoPlayer');
const videoSource = document.getElementById('videoSource');
const subtitleTrack = document.getElementById('subtitleTrack');
const currentVideoTitle = document.getElementById('currentVideoTitle');
const backBtn = document.getElementById('backBtn');
const searchInput = document.getElementById('searchInput');
const currentUserText = document.getElementById('currentUserText');
const breadcrumbs = document.getElementById('breadcrumbs');
const libraryTitle = document.getElementById('libraryTitle');

// Placeholders
const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'300\' viewBox=\'0 0 200 300\'%3E%3Crect width=\'200\' height=\'300\' fill=\'%231a1a2e\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%233a3d5e\' font-size=\'40\' font-family=\'Arial\'%3E🎬%3C/text%3E%3C/svg%3E';
const FOLDER_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'300\' viewBox=\'0 0 200 300\'%3E%3Crect width=\'200\' height=\'300\' fill=\'%231a1a2e\'/%3E%3C/svg%3E';

// --- UTILIDADES ---
function formatTitle(name) {
    if(!name) return "";
    let clean = name.replace(/\.[^/.]+$/, ""); // quitar extensión
    clean = clean.replace(/[\._]/g, ' '); // reemplazar puntos y guiones bajos por espacios
    return clean.replace(/\b\w/g, l => l.toUpperCase()); // mayúsculas iniciales
}

// --- AUTENTICACIÓN ---
async function doLogin() {
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
        currentUser = data.user;
        loginScreen.style.display = 'none';
        appContainer.style.display = 'block';
        currentUserText.innerText = currentUser.name;
        
        if (currentUser.role === 'admin') {
            document.getElementById('navAdminItem').style.display = 'block';
            loadUsersList();
        }
        showHome();
    } else {
        document.getElementById('loginError').innerText = data.error;
    }
}

function logout() { location.reload(); }

// --- NAVEGACIÓN PRINCIPAL ---
function hideAllSections() {
    mediaHomeSection.style.display = 'none';
    fileManager.style.display = 'none';
    iptvSection.style.display = 'none';
    adminPanel.style.display = 'none';
    
    // Reset active nav
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
}

function showHome() {
    isExplorerView = false;
    hideAllSections();
    mediaHomeSection.style.display = 'block';
    document.getElementById('navHome').classList.add('active');
    
    currentPath = null;
    navigationHistory = [];
    loadMedia();
    loadContinueWatching();
}

function toggleView() {
    isExplorerView = true;
    hideAllSections();
    fileManager.style.display = 'block';
    document.getElementById('navFiles').classList.add('active');
    loadFilesList();
}

function showIPTV() {
    hideAllSections();
    iptvSection.style.display = 'block';
    document.getElementById('navIPTV').classList.add('active');
    loadIPTVChannels();
}

function showAdmin() {
    hideAllSections();
    adminPanel.style.display = 'block';
    // No specific nav link for admin that highlights, but we can highlight Inicio if we want or nothing
}

function goBack() {
    if (navigationHistory.length > 0) {
        currentPath = navigationHistory.pop();
        loadMedia(currentPath);
    } else {
        showHome();
    }
}

function goHome() { showHome(); }

// --- BIBLIOTECA ---
async function loadMedia(dirPath = null) {
    let url = '/api/browse';
    if (dirPath) url += `?path=${encodeURIComponent(dirPath)}`;
    const res = await fetch(url);
    const items = await res.json();
    allItems = items;
    
    if (dirPath) {
        continueWatchingWrapper.style.display = 'none';
        libraryTitle.innerText = "Directorio: " + formatTitle(dirPath.split(/[\\/]/).pop());
    } else {
        libraryTitle.innerText = "Biblioteca";
    }

    renderMediaGrid(items);
    updateBreadcrumbs(dirPath);
    backBtn.style.display = dirPath ? 'inline-block' : 'none';
}

function renderMediaGrid(items) {
    mediaGrid.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.dataset.name = item.name.toLowerCase();
        
        const imgSrc = item.poster || (item.type === 'folder' ? FOLDER_PLACEHOLDER : PLACEHOLDER);
        const niceTitle = formatTitle(item.name);
        const typeLabel = item.type === 'folder' ? 'Carpeta' : (item.name.match(/\.(mp4|mkv|avi|mov)$/i) ? 'Video' : 'Archivo');
        
        card.innerHTML = `
            <img src="${imgSrc}" class="media-thumb" onerror="this.src='${item.type === 'folder' ? FOLDER_PLACEHOLDER : PLACEHOLDER}'">
            <div class="media-info">
                <div class="media-title" title="${item.name}">${niceTitle}</div>
                <div class="media-type">${typeLabel} ${item.hasSubtitles ? '• CC' : ''}</div>
            </div>
        `;
        
        card.onclick = () => {
            if (item.type === 'folder') {
                navigationHistory.push(currentPath);
                currentPath = item.path;
                loadMedia(currentPath);
            } else {
                playMedia(item.path, niceTitle, item.hasSubtitles, item.poster);
            }
        };
        mediaGrid.appendChild(card);
    });
}

// --- CONTINUE WATCHING ---
function loadContinueWatching() {
    continueGrid.innerHTML = '';
    let found = false;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('progress_')) {
            const rawId = key.split('progress_')[1];
            let path = "";
            try { path = atob(rawId); } catch(e) { continue; }
            
            const progInfo = JSON.parse(localStorage.getItem(key));
            const percentage = (progInfo.time / progInfo.total) * 100;
            if(percentage < 1 || percentage > 98) continue;
            
            found = true;
            const niceTitle = formatTitle(path.split(/[\\/]/).pop());
            const posterUrl = progInfo.poster || PLACEHOLDER;

            const card = document.createElement('div');
            card.className = 'media-card'; // We use the same card style for continue watching now
            card.innerHTML = `
                <img src="${posterUrl}" class="media-thumb" onerror="this.src='${PLACEHOLDER}'">
                <div class="media-info">
                    <div class="media-title">${niceTitle}</div>
                    <div class="media-type">Continuar (${Math.round(percentage)}%)</div>
                </div>
            `;
            
            card.onclick = () => {
                playMedia(path, niceTitle, false, posterUrl);
            };
            continueGrid.appendChild(card);
        }
    }

    if (found && !currentPath) {
        continueWatchingWrapper.style.display = 'block';
    } else {
        continueWatchingWrapper.style.display = 'none';
    }
}

function updateBreadcrumbs(dirPath) {
    breadcrumbs.innerHTML = '<span onclick="goHome()"><i class="fas fa-home"></i> Biblioteca</span>';
    if (dirPath) {
        const parts = dirPath.split(/[\/\\]/).filter(p => p);
        let acc = '';
        parts.forEach((part, i) => {
            acc = parts.slice(0, i+1).join('/');
            const span = document.createElement('span');
            span.innerText = formatTitle(part);
            span.onclick = () => { currentPath = acc; navigationHistory = []; loadMedia(currentPath); };
            breadcrumbs.appendChild(document.createTextNode(' / '));
            breadcrumbs.appendChild(span);
        });
    }
}

function searchMedia() {
    const term = searchInput.value.toLowerCase();
    const filtered = allItems.filter(i => formatTitle(i.name).toLowerCase().includes(term));
    renderMediaGrid(filtered);
}

// --- REPRODUCTOR ---
function playMedia(path, title, hasSubs, posterImgUrl = null) {
    currentVideoId = btoa(path);
    videoSource.src = `/stream?path=${encodeURIComponent(path)}`;
    subtitleTrack.src = hasSubs ? `/subs?path=${encodeURIComponent(path)}` : '';
    currentVideoTitle.innerText = title;
    modal.style.display = 'block';
    videoPlayer.load();
    videoPlayer.play();
    
    videoPlayer.dataset.posterUrl = posterImgUrl || PLACEHOLDER;
    
    const prog = JSON.parse(localStorage.getItem('progress_' + currentVideoId));
    if (prog && prog.time > 10 && prog.time < prog.total - 10) {
        if (confirm(`¿Continuar desde ${formatTime(prog.time)}?`)) {
            videoPlayer.currentTime = prog.time;
        }
    }
}

function closePlayer() {
    if (currentVideoId) {
        const prog = { 
            time: videoPlayer.currentTime, 
            total: videoPlayer.duration,
            poster: videoPlayer.dataset.posterUrl
        };
        localStorage.setItem('progress_' + currentVideoId, JSON.stringify(prog));
        if(!isExplorerView && !currentPath) loadContinueWatching();
    }
    modal.style.display = 'none';
    videoPlayer.pause();
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
}

setInterval(() => {
    if (currentVideoId && !videoPlayer.paused) {
        const prog = { 
            time: videoPlayer.currentTime, 
            total: videoPlayer.duration,
            poster: videoPlayer.dataset.posterUrl 
        };
        localStorage.setItem('progress_' + currentVideoId, JSON.stringify(prog));
    }
}, 5000);

// --- FILE MANAGER, USUARIOS, IPTV ---
async function loadFilesList(dirPath = null) {
    currentExplorerPath = dirPath;
    let url = '/api/files';
    if (dirPath) url += `?path=${encodeURIComponent(dirPath)}`;
    const res = await fetch(url);
    const items = await res.json();
    const tbody = document.getElementById('fileListBody');
    tbody.innerHTML = '';
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.type === 'folder' ? '📁' : '📄'} ${item.name}</td>
            <td>${item.size}</td>
            <td>
                ${item.type === 'file' ? `
                    <button class="btn-rename" onclick="renameFile('${item.path}', '${item.name}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-delete" onclick="deleteFile('${item.path}')"><i class="fas fa-trash"></i></button>
                ` : ''}
            </td>
        `;
        if (item.type === 'folder') {
            tr.style.cursor = 'pointer';
            tr.onclick = () => loadFilesList(item.path);
        }
        tbody.appendChild(tr);
    });
}
function uploadFile() {
    const input = document.getElementById('fileInput');
    if (input.files.length === 0) return alert('Selecciona al menos un archivo');
    
    const formData = new FormData();
    for (let f of input.files) formData.append('file', f);
    if (currentExplorerPath) formData.append('path', currentExplorerPath);
    
    // UI Progress Elements
    const container = document.getElementById('uploadProgressContainer');
    const bar = document.getElementById('uploadProgressBar');
    const percentageText = document.getElementById('uploadPercentageText');
    const statusText = document.getElementById('uploadStatusText');
    
    container.style.display = 'block';
    
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            bar.style.width = percent + '%';
            percentageText.innerText = percent + '%';
            statusText.innerText = `Subiendo ${input.files.length} archivo(s)...`;
        }
    };
    
    xhr.onload = () => {
        if (xhr.status === 200) {
            statusText.innerText = '¡Carga completada!';
            bar.style.backgroundColor = '#28a745'; // Verde éxito
            setTimeout(() => {
                container.style.display = 'none';
                bar.style.width = '0%';
                bar.style.backgroundColor = 'var(--accent)';
                loadFilesList(currentExplorerPath);
            }, 2000);
        } else {
            alert('Error al subir: ' + xhr.statusText);
            container.style.display = 'none';
        }
    };
    
    xhr.onerror = () => {
        alert('Error de conexión al subir');
        container.style.display = 'none';
    };
    
    xhr.open('POST', '/api/upload', true);
    xhr.send(formData);
    
    input.value = ''; // limpiar input
}
async function deleteFile(path) {
    if (!confirm('¿Eliminar archivo?')) return;
    await fetch('/api/delete', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: encodeURIComponent(path) })
    });
    loadFilesList(currentExplorerPath);
}
async function renameFile(oldPath, currentName) {
    const newName = prompt('Nuevo nombre:', currentName);
    if (!newName || newName === currentName) return;
    await fetch('/api/rename', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: encodeURIComponent(oldPath), newName })
    });
    loadFilesList(currentExplorerPath);
}
async function saveIPTVConfig() {
    const url = document.getElementById('iptvUrl').value;
    await fetch('/api/iptv/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });
    loadIPTVChannels();
}
async function loadIPTVChannels() {
    const res = await fetch('/api/iptv/channels');
    const data = await res.json();
    const grid = document.getElementById('iptvGrid');
    grid.innerHTML = '';
    if (data.channels.length === 0) {
        grid.innerHTML = '<p>No hay canales. Carga una lista M3U.</p>';
        return;
    }
    data.channels.forEach(ch => {
        const card = document.createElement('div');
        card.className = 'iptv-card';
        card.innerHTML = `
            <img src="${ch.logo}" class="iptv-logo" onerror="this.src='${PLACEHOLDER}'">
            <p>${ch.name}</p>
        `;
        card.onclick = () => playMedia(ch.url, ch.name, false);
        grid.appendChild(card);
    });
}
async function loadUsersList() {
    const res = await fetch('/api/users');
    const users = await res.json();
    const list = document.getElementById('usersList');
    list.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.padding = '0.5rem 0';
        li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        li.innerHTML = `<span>${u.name} (${u.username}) - <b>${u.role}</b></span>`;
        if (u.username !== 'admin') {
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-delete';
            delBtn.innerHTML = '<i class="fas fa-trash"></i>';
            delBtn.onclick = () => deleteUser(u.id);
            li.appendChild(delBtn);
        }
        list.appendChild(li);
    });
}
async function createUser() {
    const username = document.getElementById('newUser').value;
    const password = document.getElementById('newPass').value;
    const name = document.getElementById('newName').value;
    const role = document.getElementById('newRole').value;
    if(!username || !password || !name) return alert('Completa todos los campos');
    await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, role })
    });
    loadUsersList();
}
async function updateServer() {
    if (!confirm('¿Seguro que deseas actualizar el servidor? Buscará cambios en GitHub y se reiniciará.')) return;
    
    const btn = document.querySelector('button[onclick="updateServer()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/admin/update', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert('¡Actualización exitosa! El servidor se está reiniciando. Espera unos segundos y refresca la página.');
            setTimeout(() => location.reload(), 5000);
        } else {
            alert('Error al actualizar: ' + data.error);
        }
    } catch (e) {
        alert('Cercando la conexión: El servidor se está reiniciando...');
        setTimeout(() => location.reload(), 5000);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.onclick = (e) => { if (e.target == modal) closePlayer(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'block') closePlayer(); });

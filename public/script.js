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
const header = document.querySelector('.header');
const navMenu = document.querySelector('.nav-menu');
const mainContainer = document.querySelector('.container');
const mediaGrid = document.getElementById('mediaGrid');
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
const sectionTitle = document.getElementById('sectionTitle');
const currentUserText = document.getElementById('currentUserText');
const breadcrumbs = document.getElementById('breadcrumbs');

// Placeholders
const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'250\' viewBox=\'0 0 200 250\'%3E%3Crect width=\'200\' height=\'250\' fill=\'%231a1a2e\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23f2a900\' font-size=\'30\' font-family=\'Arial\'%3E🎬%3C/text%3E%3C/svg%3E';
const FOLDER_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'250\' viewBox=\'0 0 200 250\'%3E%3Crect width=\'200\' height=\'250\' fill=\'%231a1a2e\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%234285f4\' font-size=\'30\' font-family=\'Arial\'%3E📁%3C/text%3E%3C/svg%3E';

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
        header.style.display = 'flex';
        navMenu.style.display = 'block';
        mainContainer.style.display = 'block';
        currentUserText.innerText = currentUser.name;
        if (currentUser.role === 'admin') {
            adminPanel.style.display = 'block';
            loadUsersList();
        }
        showHome();
    } else {
        document.getElementById('loginError').innerText = data.error;
    }
}

function logout() { location.reload(); }

// --- USUARIOS (ADMIN) ---
async function loadUsersList() {
    const res = await fetch('/api/users');
    const users = await res.json();
    const list = document.getElementById('usersList');
    list.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        li.innerHTML = `${u.name} (${u.username}) - <b>${u.role}</b>`;
        if (u.username !== 'admin') {
            const delBtn = document.createElement('button');
            delBtn.innerText = '🗑️';
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
    await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, role })
    });
    loadUsersList();
}

async function deleteUser(id) {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    loadUsersList();
}

// --- NAVEGACIÓN PRINCIPAL ---
function showHome() {
    isExplorerView = false;
    mediaGrid.style.display = 'grid';
    fileManager.style.display = 'none';
    iptvSection.style.display = 'none';
    sectionTitle.style.display = 'block';
    backBtn.style.display = 'none';
    currentPath = null;
    navigationHistory = [];
    loadMedia();
}

function toggleView() {
    isExplorerView = true;
    mediaGrid.style.display = 'none';
    fileManager.style.display = 'block';
    iptvSection.style.display = 'none';
    sectionTitle.style.display = 'none';
    backBtn.style.display = 'none';
    loadFilesList();
}

function showIPTV() {
    mediaGrid.style.display = 'none';
    fileManager.style.display = 'none';
    iptvSection.style.display = 'block';
    sectionTitle.style.display = 'none';
    backBtn.style.display = 'none';
    loadIPTVChannels();
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
        card.innerHTML = `
            <img src="${imgSrc}" class="media-thumb" onerror="this.src='${item.type === 'folder' ? FOLDER_PLACEHOLDER : PLACEHOLDER}'">
            <div class="media-info">
                <h3 class="media-title">${item.name}</h3>
                <p class="media-type">${item.type === 'folder' ? '📁 Carpeta' : '🎬 Video'}</p>
                ${item.hasSubtitles ? '<span class="media-type"><i class="fas fa-closed-captioning"></i></span>' : ''}
            </div>
        `;
        card.onclick = () => {
            if (item.type === 'folder') {
                navigationHistory.push(currentPath);
                currentPath = item.path;
                loadMedia(currentPath);
            } else {
                playMedia(item.path, item.name, item.hasSubtitles);
            }
        };
        mediaGrid.appendChild(card);
    });
}

function updateBreadcrumbs(dirPath) {
    breadcrumbs.innerHTML = '<span onclick="goHome()">📁 Biblioteca</span>';
    if (dirPath) {
        const parts = dirPath.split(/[\/\\]/).filter(p => p);
        let acc = '';
        parts.forEach((part, i) => {
            acc = parts.slice(0, i+1).join('/');
            const span = document.createElement('span');
            span.innerText = part;
            span.onclick = () => { currentPath = acc; navigationHistory = []; loadMedia(currentPath); };
            breadcrumbs.appendChild(document.createTextNode(' / '));
            breadcrumbs.appendChild(span);
        });
    }
}

function searchMedia() {
    const term = searchInput.value.toLowerCase();
    const filtered = allItems.filter(i => i.name.toLowerCase().includes(term));
    renderMediaGrid(filtered);
}

// --- REPRODUCTOR ---
function playMedia(path, title, hasSubs) {
    currentVideoId = btoa(path);
    videoSource.src = `/stream?path=${encodeURIComponent(path)}`;
    subtitleTrack.src = hasSubs ? `/subs?path=${encodeURIComponent(path)}` : '';
    currentVideoTitle.innerText = title;
    modal.style.display = 'block';
    videoPlayer.load();
    videoPlayer.play();
    
    const prog = JSON.parse(localStorage.getItem('progress_' + currentVideoId));
    if (prog && prog.time > 10 && prog.time < prog.total - 10) {
        if (confirm(`¿Continuar desde ${formatTime(prog.time)}?`)) {
            videoPlayer.currentTime = prog.time;
        }
    }
}

function closePlayer() {
    if (currentVideoId) {
        const prog = { time: videoPlayer.currentTime, total: videoPlayer.duration };
        localStorage.setItem('progress_' + currentVideoId, JSON.stringify(prog));
    }
    modal.style.display = 'none';
    videoPlayer.pause();
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
}

// --- FILE MANAGER ---
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
                    <button class="btn-rename" onclick="renameFile('${item.path}', '${item.name}')">✏️</button>
                    <button class="btn-delete" onclick="deleteFile('${item.path}')">🗑️</button>
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

async function uploadFile() {
    const input = document.getElementById('fileInput');
    const formData = new FormData();
    for (let f of input.files) formData.append('file', f);
    if (currentExplorerPath) formData.append('path', currentExplorerPath);
    await fetch('/api/upload', { method: 'POST', body: formData });
    loadFilesList(currentExplorerPath);
}

async function deleteFile(path) {
    if (!confirm('¿Eliminar archivo?')) return;
    await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: encodeURIComponent(path) })
    });
    loadFilesList(currentExplorerPath);
}

async function renameFile(oldPath, currentName) {
    const newName = prompt('Nuevo nombre:', currentName);
    if (!newName || newName === currentName) return;
    await fetch('/api/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: encodeURIComponent(oldPath), newName })
    });
    loadFilesList(currentExplorerPath);
}

// --- IPTV ---
async function saveIPTVConfig() {
    const url = document.getElementById('iptvUrl').value;
    await fetch('/api/iptv/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        grid.innerHTML = '<p>Carga una lista M3U.</p>';
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

// Cerrar modal con click fuera
window.onclick = (e) => { if (e.target == modal) closePlayer(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'block') closePlayer(); });

// Guardar progreso periódicamente
setInterval(() => {
    if (currentVideoId && !videoPlayer.paused) {
        localStorage.setItem('progress_' + currentVideoId, JSON.stringify({
            time: videoPlayer.currentTime,
            total: videoPlayer.duration
        }));
    }
}, 5000);

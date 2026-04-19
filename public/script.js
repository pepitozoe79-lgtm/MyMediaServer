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
const heroSection = document.getElementById('heroSection');
const heroTitle = document.getElementById('heroTitle');
const heroBg = document.getElementById('heroBg');
const heroDesc = document.getElementById('heroDesc');
const heroPlayBtn = document.getElementById('heroPlayBtn');
const heroTag = document.getElementById('heroTag');
const breadcrumbs = document.getElementById('breadcrumbs');
const libraryTitle = document.getElementById('libraryTitle');
const currentUserText = document.getElementById('currentUserText');

// Placeholders
const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'300\' viewBox=\'0 0 200 300\'%3E%3Crect width=\'200\' height=\'300\' fill=\'%23121212\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23333\' font-size=\'40\'%3E🎬%3C/text%3E%3C/svg%3E';
const FOLDER_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'300\' viewBox=\'0 0 200 300\'%3E%3Crect width=\'200\' height=\'300\' fill=\'%23121212\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23333\' font-size=\'40\'%3E📁%3C/text%3E%3C/svg%3E';

// --- UTILIDADES ---
function formatTitle(name) {
    if(!name) return "";
    let clean = name.replace(/\.[^/.]+$/, "");
    clean = clean.replace(/[\._]/g, ' ');
    return clean.replace(/\b\w/g, l => l.toUpperCase());
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
        appContainer.style.display = 'flex';
        currentUserText.innerText = currentUser.name;
        showHome();
    } else {
        document.getElementById('loginError').innerText = data.error;
    }
}

function logout() { location.reload(); }

// --- NAVEGACIÓN ---
function hideAllSections() {
    mediaHomeSection.style.display = 'none';
    fileManager.style.display = 'none';
    iptvSection.style.display = 'none';
    adminPanel.style.display = 'none';
    heroSection.style.display = 'none';
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
}

function showHome() {
    isExplorerView = false;
    hideAllSections();
    mediaHomeSection.style.display = 'block';
    heroSection.style.display = 'flex';
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
    document.getElementById('navAdmin').classList.add('active');
    if(currentUser.role === 'admin') loadUsersList();
}

function goBack() {
    if (navigationHistory.length > 0) {
        currentPath = navigationHistory.pop();
        loadMedia(currentPath);
    } else {
        showHome();
    }
}

// --- BIBLIOTECA ---
async function loadMedia(dirPath = null) {
    let url = '/api/browse';
    if (dirPath) url += `?path=${encodeURIComponent(dirPath)}`;
    const res = await fetch(url);
    const items = await res.json();
    allItems = items;
    
    if (dirPath) {
        heroSection.style.display = 'none';
        libraryTitle.innerText = "Folder Content";
        updateBreadcrumbs(dirPath);
    } else {
        heroSection.style.display = 'flex';
        libraryTitle.innerText = "Recently Added";
        breadcrumbs.innerHTML = '';
        updateHero(items[0]); // El primero de la lista al Hero
    }

    renderMediaGrid(items);
}

function updateHero(item) {
    if(!item) return;
    const niceTitle = formatTitle(item.name);
    heroTitle.innerText = niceTitle;
    heroBg.style.backgroundImage = `url('${item.poster || ''}')`;
    heroTag.innerText = item.type === 'folder' ? 'Featured Collection' : 'Must Watch';
    heroPlayBtn.onclick = () => {
        if(item.type === 'video') playMedia(item.path, niceTitle, item.hasSubtitles, item.poster);
        else {
            navigationHistory.push(currentPath);
            currentPath = item.path;
            loadMedia(currentPath);
        }
    };
}

function renderMediaGrid(items) {
    mediaGrid.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-card';
        const niceTitle = formatTitle(item.name);
        const imgSrc = item.poster || (item.type === 'folder' ? FOLDER_PLACEHOLDER : PLACEHOLDER);
        
        card.innerHTML = `
            <img src="${imgSrc}" class="card-thumb" onerror="this.src='${item.type === 'folder' ? FOLDER_PLACEHOLDER : PLACEHOLDER}'">
            <div class="card-title">${niceTitle}</div>
            <div class="card-meta">${item.type === 'folder' ? 'Collection' : 'Movie'}</div>
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

function updateBreadcrumbs(dirPath) {
    breadcrumbs.innerHTML = '<span onclick="showHome()">Home</span>';
    if (dirPath) {
        const parts = dirPath.split(/[\/\\]/).filter(p => !p.includes(':') && p !== 'media' && p !== 'servidor_multimedia');
        let acc = '';
        parts.forEach((part, i) => {
            acc = dirPath.split(part)[0] + part;
            const span = document.createElement('span');
            span.innerText = ' > ' + formatTitle(part);
            span.onclick = () => { currentPath = acc; navigationHistory = []; loadMedia(currentPath); };
            breadcrumbs.appendChild(span);
        });
    }
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
            card.className = 'media-card';
            card.innerHTML = `
                <img src="${posterUrl}" class="card-thumb" onerror="this.src='${PLACEHOLDER}'">
                <div class="card-title">${niceTitle}</div>
                <div class="card-meta">${Math.round(percentage)}% Completed</div>
            `;
            
            card.onclick = () => playMedia(path, niceTitle, false, posterUrl);
            continueGrid.appendChild(card);
        }
    }
    continueWatchingWrapper.style.display = found && !currentPath ? 'block' : 'none';
}

// --- REPRODUCTOR ---
function playMedia(path, title, hasSubs, posterImgUrl) {
    currentVideoId = btoa(path);
    document.getElementById('videoSource').src = `/stream?path=${encodeURIComponent(path)}`;
    document.getElementById('subtitleTrack').src = hasSubs ? `/subs?path=${encodeURIComponent(path)}` : '';
    document.getElementById('currentVideoTitle').innerText = title;
    modal.style.display = 'block';
    videoPlayer.dataset.posterUrl = posterImgUrl || PLACEHOLDER;
    videoPlayer.load();
    videoPlayer.play();
}

function closePlayer() {
    if (currentVideoId) {
        const prog = { time: videoPlayer.currentTime, total: videoPlayer.duration, poster: videoPlayer.dataset.posterUrl };
        localStorage.setItem('progress_' + currentVideoId, JSON.stringify(prog));
        if(!isExplorerView && !currentPath) loadContinueWatching();
    }
    modal.style.display = 'none';
    videoPlayer.pause();
}

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
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        tr.innerHTML = `
            <td style="padding: 1rem;">${item.type === 'folder' ? '📁' : '📄'} ${item.name}</td>
            <td style="padding: 1rem;">${item.size}</td>
            <td style="padding: 1rem;">
                ${item.type === 'file' ? `
                    <button class="btn-icon" onclick="renameFile('${item.path}', '${item.name}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" style="color: #ff4d4d;" onclick="deleteFile('${item.path}')"><i class="fas fa-trash"></i></button>
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
    if (input.files.length === 0) return alert('Select files to upload');
    const formData = new FormData();
    for (let f of input.files) formData.append('file', f);
    if (currentExplorerPath) formData.append('path', currentExplorerPath);
    
    const container = document.getElementById('uploadProgressContainer');
    const bar = document.getElementById('uploadProgressBar');
    const percentageText = document.getElementById('uploadPercentageText');
    const statusText = document.getElementById('uploadStatusText');
    container.style.display = 'block';
    
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            bar.style.width = pct + '%';
            percentageText.innerText = pct + '%';
        }
    };
    xhr.onload = () => {
        if (xhr.status === 200) {
            statusText.innerText = 'Upload Complete!';
            setTimeout(() => { container.style.display = 'none'; loadFilesList(currentExplorerPath); }, 2000);
        }
    };
    xhr.open('POST', '/api/upload', true);
    xhr.send(formData);
}

async function updateServer() {
    if (!confirm('Update server?')) return;
    const res = await fetch('/api/admin/update', { method: 'POST' });
    const data = await res.json();
    if (data.success) alert('Updating... server will restart.');
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
        li.style.padding = '1rem';
        li.style.background = 'var(--glass)';
        li.style.borderRadius = '12px';
        li.style.marginBottom = '0.5rem';
        li.innerHTML = `<span>${u.name} (@${u.username})</span>`;
        if (u.username !== 'admin') {
            const del = document.createElement('button');
            del.className = 'btn-icon';
            del.innerHTML = '<i class="fas fa-trash" style="color:#ff4d4d"></i>';
            del.onclick = () => deleteUser(u.id);
            li.appendChild(del);
        }
        list.appendChild(li);
    });
}

// More functions (search, IPTV, etc.) follow similar pattern...
function searchMedia() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allItems.filter(i => formatTitle(i.name).toLowerCase().includes(term));
    renderMediaGrid(filtered);
}

window.onclick = (e) => { if (e.target == modal) closePlayer(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'block') closePlayer(); });

// ===== SPOTYVOYD - MAIN APP SCRIPT =====

// DOM Elements
const splashScreen = document.getElementById('splashScreen');
const appContent = document.getElementById('appContent');
const spotifyUrlInput = document.getElementById('spotifyUrl');
const pasteBtn = document.getElementById('pasteBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewSection = document.getElementById('previewSection');
const musicCard = document.getElementById('musicCard');
const coverImage = document.getElementById('coverImage');
const cardTitle = document.getElementById('cardTitle');
const cardArtist = document.getElementById('cardArtist');
const cardDuration = document.getElementById('cardDuration');
const cardYear = document.getElementById('cardYear');
const downloadMp3Btn = document.getElementById('downloadMp3Btn');
const downloadCoverBtn = document.getElementById('downloadCoverBtn');
const copyTitleBtn = document.getElementById('copyTitleBtn');
const downloadingScreen = document.getElementById('downloadingScreen');
const progressRingFill = document.getElementById('progressRingFill');
const progressPercentage = document.getElementById('progressPercentage');
const downloadingStatus = document.getElementById('downloadingStatus');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const desktopBlock = document.getElementById('desktopBlock');
const mobileContainer = document.getElementById('mobileContainer');
const navItems = document.querySelectorAll('.nav-item');
const mainContent = document.querySelector('.main-content');

// App State
let currentTrackData = null;
let downloadHistory = [];
let isDownloading = false;
let currentTab = 'home';

// ===== INITIALIZATION =====
function init() {
    // Check if mobile
    checkDevice();
    
    // Load history from localStorage
    loadHistory();
    
    // Initialize particles
    createParticles();
    
    // Show splash screen
    showSplash();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check clipboard for Spotify URL
    checkClipboard();
}

// Check device type
function checkDevice() {
    const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    if (!isMobile) {
        desktopBlock.style.display = 'flex';
        mobileContainer.style.display = 'none';
    } else {
        desktopBlock.style.display = 'none';
        mobileContainer.style.display = 'flex';
    }
}

// Handle resize
window.addEventListener('resize', checkDevice);

// Create floating particles
function createParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;
    
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 6 + 4) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.width = (Math.random() * 3 + 1) + 'px';
        particle.style.height = particle.style.width;
        
        if (Math.random() > 0.7) {
            particle.style.background = '#1DB954';
        } else if (Math.random() > 0.5) {
            particle.style.background = '#7B2FF7';
        }
        
        container.appendChild(particle);
    }
}

// Show splash screen
function showSplash() {
    splashScreen.style.display = 'flex';
    appContent.style.display = 'none';
    
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            appContent.style.display = 'flex';
        }, 600);
    }, 2500);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Paste button
    pasteBtn.addEventListener('click', handlePaste);
    
    // Clear button
    clearBtn.addEventListener('click', clearInput);
    
    // Input changes
    spotifyUrlInput.addEventListener('input', handleInputChange);
    
    // Download button
    downloadBtn.addEventListener('click', handleDownload);
    
    // Card action buttons
    downloadMp3Btn.addEventListener('click', () => downloadMp3());
    downloadCoverBtn.addEventListener('click', () => downloadCover());
    copyTitleBtn.addEventListener('click', copyTitle);
    
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Clear history
    clearHistoryBtn.addEventListener('click', clearAllHistory);
    
    // Handle URL paste from keyboard
    spotifyUrlInput.addEventListener('paste', (e) => {
        setTimeout(() => {
            handleInputChange();
        }, 100);
    });
}

// Handle paste button click
async function handlePaste() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            spotifyUrlInput.value = text;
            handleInputChange();
            showToast('Link pasted from clipboard', 'success');
        }
    } catch (err) {
        // Fallback: focus input and show keyboard
        spotifyUrlInput.focus();
        showToast('Tap and hold to paste', 'error');
    }
}

// Handle input changes
function handleInputChange() {
    const value = spotifyUrlInput.value.trim();
    
    if (value.length > 0) {
        clearBtn.style.display = 'flex';
        pasteBtn.style.display = 'none';
        downloadBtn.disabled = false;
    } else {
        clearBtn.style.display = 'none';
        pasteBtn.style.display = 'flex';
        downloadBtn.disabled = true;
    }
}

// Clear input
function clearInput() {
    spotifyUrlInput.value = '';
    clearBtn.style.display = 'none';
    pasteBtn.style.display = 'flex';
    downloadBtn.disabled = true;
    hidePreview();
    spotifyUrlInput.focus();
}

// Check clipboard for Spotify URL
async function checkClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text && (text.includes('spotify.com/track/') || text.includes('open.spotify.com'))) {
            spotifyUrlInput.value = text;
            handleInputChange();
            showToast('Spotify link detected! 🎵', 'success');
        }
    } catch (err) {
        // Clipboard access denied or empty
    }
}

// ===== MAIN DOWNLOAD FLOW =====
async function handleDownload() {
    if (isDownloading) return;
    
    const url = spotifyUrlInput.value.trim();
    
    // Validate URL
    if (!url) {
        showToast('Please paste a Spotify link first', 'error');
        vibrate();
        return;
    }
    
    if (!url.includes('spotify.com/track/')) {
        showToast('Invalid Spotify track link', 'error');
        vibrate();
        return;
    }
    
    // Hide preview if shown
    hidePreview();
    
    // Start downloading animation
    isDownloading = true;
    downloadBtn.disabled = true;
    showDownloadingScreen();
    
    // Simulate download progress
    const statuses = [
        'Searching audio...',
        'Preparing file...',
        'Downloading...',
        'Saving to device...'
    ];
    
    try {
        // Update status every second
        for (let i = 0; i < statuses.length; i++) {
            await updateProgress((i + 1) * 25, statuses[i]);
            await sleep(800);
        }
        
        // Make API request
        const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            // Update progress to 100%
            await updateProgress(100, 'Complete!');
            
            // Store track data
            currentTrackData = data.data;
            
            // Show preview card
            await sleep(500);
            hideDownloadingScreen();
            showPreview(currentTrackData);
            
            // Add to history
            addToHistory(currentTrackData);
            
            // Trigger vibration feedback
            vibrate([50, 30, 50]);
            
            showToast('Ready to download! 🎵', 'success');
        } else {
            throw new Error(data.message || 'Failed to fetch track data');
        }
    } catch (error) {
        hideDownloadingScreen();
        showToast(error.message || 'Something went wrong. Try again.', 'error');
        vibrate();
        console.error('Download error:', error);
    } finally {
        isDownloading = false;
        downloadBtn.disabled = false;
    }
}

// Update progress animation
async function updateProgress(percent, status) {
    const circumference = 2 * Math.PI * 52; // 52 is the radius
    const offset = circumference - (percent / 100) * circumference;
    
    progressRingFill.style.strokeDashoffset = offset;
    progressPercentage.textContent = Math.round(percent) + '%';
    downloadingStatus.textContent = status;
    
    // Animate equalizer bars
    const bars = document.querySelectorAll('#equalizerBars span');
    bars.forEach((bar, index) => {
        bar.style.animationDuration = (0.3 + Math.random() * 0.5) + 's';
    });
}

// Show downloading screen
function showDownloadingScreen() {
    downloadingScreen.style.display = 'flex';
    progressRingFill.style.strokeDashoffset = '326.7';
    progressPercentage.textContent = '0%';
    downloadingStatus.textContent = 'Searching audio...';
}

// Hide downloading screen
function hideDownloadingScreen() {
    downloadingScreen.style.display = 'none';
}

// ===== PREVIEW CARD =====
function showPreview(data) {
    coverImage.src = data.coverUrl || 'https://via.placeholder.com/300/1DB954/FFFFFF?text=Music';
    cardTitle.textContent = data.title;
    cardArtist.textContent = data.artist;
    cardDuration.textContent = data.duration || '3:20';
    cardYear.textContent = data.releaseYear || '2024';
    
    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Re-trigger animation
    musicCard.style.animation = 'none';
    musicCard.offsetHeight; // Trigger reflow
    musicCard.style.animation = 'cardReveal 0.6s ease-out';
}

function hidePreview() {
    previewSection.style.display = 'none';
    currentTrackData = null;
}

// ===== DOWNLOAD ACTIONS =====
async function downloadMp3() {
    if (!currentTrackData || !currentTrackData.downloadUrl) {
        showToast('No download link available', 'error');
        return;
    }
    
    try {
        showToast('Starting download...', 'success');
        
        // Show downloading animation
        showDownloadingScreen();
        await updateProgress(10, 'Preparing download...');
        await sleep(500);
        await updateProgress(50, 'Downloading MP3...');
        
        // Create download link
        const link = document.createElement('a');
        link.href = currentTrackData.downloadUrl;
        link.download = currentTrackData.filename || `${currentTrackData.artist} - ${currentTrackData.title}.mp3`;
        link.target = '_blank';
        document.body.appendChild(link);
        
        await updateProgress(80, 'Saving file...');
        await sleep(300);
        
        link.click();
        document.body.removeChild(link);
        
        await updateProgress(100, 'Download complete!');
        await sleep(600);
        hideDownloadingScreen();
        
        showToast('MP3 downloaded! 🎵', 'success');
        vibrate([50, 30, 50]);
        
    } catch (error) {
        hideDownloadingScreen();
        showToast('Download failed. Try again.', 'error');
        console.error('MP3 download error:', error);
    }
}

async function downloadCover() {
    if (!currentTrackData || !currentTrackData.coverUrl) {
        showToast('No cover image available', 'error');
        return;
    }
    
    try {
        showToast('Downloading cover...', 'success');
        
        const link = document.createElement('a');
        link.href = currentTrackData.coverUrl;
        link.download = `${currentTrackData.artist} - ${currentTrackData.title} [Cover].jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Cover saved! 🖼️', 'success');
        vibrate(30);
        
    } catch (error) {
        showToast('Failed to download cover', 'error');
        console.error('Cover download error:', error);
    }
}

async function copyTitle() {
    if (!currentTrackData) return;
    
    const text = `${currentTrackData.artist} - ${currentTrackData.title}`;
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('Title copied! 📋', 'success');
        vibrate(20);
    } catch (err) {
        // Fallback
        const tempInput = document.createElement('input');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showToast('Title copied! 📋', 'success');
    }
}

// ===== HISTORY MANAGEMENT =====
function addToHistory(data) {
    const historyItem = {
        id: Date.now(),
        title: data.title,
        artist: data.artist,
        coverUrl: data.coverUrl,
        filename: data.filename,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fileSize: '~4.2 MB' // Simulated
    };
    
    downloadHistory.unshift(historyItem);
    
    // Keep only last 50 items
    if (downloadHistory.length > 50) {
        downloadHistory = downloadHistory.slice(0, 50);
    }
    
    saveHistory();
    renderHistory();
}

function renderHistory() {
    if (!historyList) return;
    
    if (downloadHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                    <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
                <p>No downloads yet</p>
            </div>
        `;
        clearHistoryBtn.style.display = 'none';
        return;
    }
    
    clearHistoryBtn.style.display = 'inline-block';
    
    historyList.innerHTML = downloadHistory.map((item, index) => `
        <div class="history-item" data-id="${item.id}" style="animation: fadeInUp 0.4s ease-out ${index * 0.05}s both;">
            <div class="history-thumb">
                <img src="${item.coverUrl || 'https://via.placeholder.com/48/1DB954/FFFFFF?text=M'}" alt="${item.title}" loading="lazy">
            </div>
            <div class="history-info">
                <div class="history-title">${item.artist} - ${item.title}</div>
                <div class="history-meta">
                    <span>${item.fileSize}</span>
                    <span>•</span>
                    <span>${item.date} ${item.time}</span>
                </div>
            </div>
            <button class="history-delete" data-id="${item.id}" aria-label="Delete">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        </div>
    `).join('');
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.history-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            deleteHistoryItem(id);
        });
    });
    
    // Add swipe gesture to history items
    document.querySelectorAll('.history-item').forEach(item => {
        let startX = 0;
        let isSwiping = false;
        
        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = true;
        });
        
        item.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            const diff = startX - e.touches[0].clientX;
            if (diff > 20) {
                item.style.transform = `translateX(-${Math.min(diff, 100)}px)`;
                item.style.opacity = Math.max(0.3, 1 - diff / 200);
            }
        });
        
        item.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            isSwiping = false;
            const diff = startX - e.changedTouches[0].clientX;
            
            if (diff > 80) {
                // Delete item
                const id = parseInt(item.dataset.id);
                item.style.transform = 'translateX(-150%)';
                item.style.opacity = '0';
                setTimeout(() => deleteHistoryItem(id), 300);
            } else {
                // Reset position
                item.style.transform = 'translateX(0)';
                item.style.opacity = '1';
            }
        });
        
        // Long press to show options
        let longPressTimer;
        item.addEventListener('touchstart', () => {
            longPressTimer = setTimeout(() => {
                vibrate(50);
                showToast('Swipe left to delete', 'success');
            }, 500);
        });
        
        item.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
        
        item.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });
    });
}

function deleteHistoryItem(id) {
    downloadHistory = downloadHistory.filter(item => item.id !== id);
    saveHistory();
    renderHistory();
    showToast('Removed from history', 'success');
}

function clearAllHistory() {
    if (confirm('Clear all download history?')) {
        downloadHistory = [];
        saveHistory();
        renderHistory();
        showToast('History cleared', 'success');
        vibrate(30);
    }
}

function saveHistory() {
    try {
        localStorage.setItem('spotyvoyd_history', JSON.stringify(downloadHistory));
    } catch (e) {
        console.warn('Failed to save history:', e);
    }
}

function loadHistory() {
    try {
        const stored = localStorage.getItem('spotyvoyd_history');
        if (stored) {
            downloadHistory = JSON.parse(stored);
        }
    } catch (e) {
        downloadHistory = [];
    }
    renderHistory();
}

// ===== NAVIGATION =====
function switchTab(tab) {
    currentTab = tab;
    
    // Update nav items
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });
    
    // Handle tab switching
    switch (tab) {
        case 'home':
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'history':
            const historySection = document.getElementById('historySection');
            if (historySection) {
                historySection.scrollIntoView({ behavior: 'smooth' });
            }
            break;
        case 'downloads':
            showToast('Check your device downloads folder 📁', 'success');
            break;
        case 'settings':
            showSettings();
            break;
    }
}

function showSettings() {
    // Simple settings overlay
    const settingsHTML = `
        <div class="settings-panel active">
            <div class="setting-item">
                <span class="setting-label">App Version</span>
                <span class="setting-value">1.0.0</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">Downloads</span>
                <span class="setting-value">${downloadHistory.length} files</span>
            </div>
            <div class="setting-item" onclick="clearAllHistory()">
                <span class="setting-label" style="color: #ff3b30;">Clear All Data</span>
                <span class="setting-value">🗑️</span>
            </div>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = settingsHTML;
    
    // Replace main content temporarily
    const existingSettings = document.querySelector('.settings-panel');
    if (existingSettings) {
        existingSettings.remove();
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        const historySection = document.getElementById('historySection');
        if (historySection) {
            historySection.insertAdjacentHTML('beforebegin', settingsHTML);
            document.querySelector('.settings-panel').scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// ===== UTILITIES =====
function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

function vibrate(pattern = 30) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('SW registered:', registration.scope);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    });
}

// ===== INITIALIZE APP =====
document.addEventListener('DOMContentLoaded', init);

// Handle back button on mobile
window.addEventListener('popstate', (e) => {
    if (currentTab !== 'home') {
        switchTab('home');
        e.preventDefault();
    }
});

// Push initial state for back button handling
if (window.history && window.history.pushState) {
    window.history.pushState('forward', null, '');
}

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiter
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 10;

function rateLimiter(req, res, next) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    if (!requestCounts[ip]) {
        requestCounts[ip] = { count: 1, startTime: now };
        next();
    } else {
        const elapsed = now - requestCounts[ip].startTime;
        if (elapsed > RATE_LIMIT_WINDOW) {
            requestCounts[ip] = { count: 1, startTime: now };
            next();
        } else if (requestCounts[ip].count < MAX_REQUESTS) {
            requestCounts[ip].count++;
            next();
        } else {
            res.status(429).json({ 
                success: false, 
                message: 'Terlalu banyak request. Coba lagi 1 menit.' 
            });
        }
    }
}

// Ekstrak Spotify Track ID
function extractSpotifyId(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const trackIndex = pathParts.indexOf('track');
        if (trackIndex !== -1 && pathParts[trackIndex + 1]) {
            return pathParts[trackIndex + 1].split('?')[0];
        }
        return null;
    } catch {
        return null;
    }
}

// ENDPOINT DOWNLOAD
app.get('/api/download', rateLimiter, async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ 
            success: false, 
            message: 'Masukkan URL Spotify dulu!' 
        });
    }
    
    const trackId = extractSpotifyId(url);
    if (!trackId) {
        return res.status(400).json({ 
            success: false, 
            message: 'URL Spotify tidak valid! Harus link track.' 
        });
    }
    
    console.log(`🔍 Mencari: ${trackId}`);
    
    // ==========================================
    // API 1: SpotifyDown (PALING STABIL)
    // ==========================================
    try {
        console.log('📡 Coba API 1: spotifydown.com');
        
        const metadataRes = await axios.get(
            `https://api.spotifydown.com/track?id=${trackId}`,
            { 
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
                    'Origin': 'https://spotifydown.com',
                    'Referer': 'https://spotifydown.com/'
                }
            }
        );
        
        const data = metadataRes.data;
        
        if (data && data.link) {
            console.log('✅ DAPAT!');
            return res.json({
                success: true,
                data: {
                    title: data.title || 'Unknown Title',
                    artist: data.artist || 'Unknown Artist',
                    album: data.album || 'Unknown Album',
                    coverUrl: data.cover || '',
                    downloadUrl: data.link,
                    filename: `${data.artist} - ${data.title}.mp3`
                        .replace(/[<>:"/\\|?*]/g, '')
                        .replace(/\s+/g, ' ')
                }
            });
        }
    } catch (err) {
        console.log('❌ API 1 gagal:', err.message);
    }
    
    // ==========================================
    // API 2: Spotify Preview (30 detik official)
    // ==========================================
    try {
        console.log('📡 Coba API 2: Spotify Official API');
        
        // Dapat token Spotify
        const tokenRes = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(
                        '4eb3e1a9c5e24a2d8f1d4a7b9c3e6f8a:2d8f1d4a7b9c3e6f8a4eb3e1a9c5e24a'
                    ).toString('base64')
                },
                timeout: 10000
            }
        );
        
        const token = tokenRes.data.access_token;
        
        const trackRes = await axios.get(
            `https://api.spotify.com/v1/tracks/${trackId}`,
            {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            }
        );
        
        const track = trackRes.data;
        
        if (track && track.preview_url) {
            console.log('✅ DAPAT PREVIEW!');
            return res.json({
                success: true,
                data: {
                    title: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    album: track.album.name,
                    coverUrl: track.album.images[0]?.url || '',
                    downloadUrl: track.preview_url,
                    filename: `${track.artists[0].name} - ${track.name} (Preview).mp3`
                        .replace(/[<>:"/\\|?*]/g, '')
                }
            });
        }
    } catch (err) {
        console.log('❌ API 2 gagal:', err.message);
    }
    
    // ==========================================
    // FALLBACK: GAGAL SEMUA
    // ==========================================
    return res.status(404).json({
        success: false,
        message: 'Lagu tidak ditemukan. Coba link Spotify lain atau cek koneksi internet.'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '✅ SpotyVoyd API Ready!',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Halaman tidak ditemukan' 
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SpotyVoyd running on port ${PORT}\n`);
});

module.exports = app;

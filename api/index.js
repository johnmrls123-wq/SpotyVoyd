const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Fungsi ekstrak ID dari URL Spotify
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

// Endpoint download
app.get('/api/download', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.json({
                success: false,
                message: 'Masukkan URL Spotify!'
            });
        }
        
        const trackId = extractSpotifyId(url);
        if (!trackId) {
            return res.json({
                success: false,
                message: 'URL tidak valid! Harus link track Spotify.'
            });
        }
        
        console.log('Track ID:', trackId);
        
        // Coba ambil data dari Spotify API
        const response = await axios({
            method: 'GET',
            url: `https://api.spotifydown.com/track?id=${trackId}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
                'Origin': 'https://spotifydown.com',
                'Referer': 'https://spotifydown.com/'
            },
            timeout: 10000
        });
        
        const data = response.data;
        
        if (data && data.title) {
            return res.json({
                success: true,
                data: {
                    title: data.title,
                    artist: data.artist || 'Unknown',
                    album: data.album || 'Unknown',
                    coverUrl: data.cover || '',
                    downloadUrl: data.link || '',
                    filename: `${data.artist} - ${data.title}.mp3`
                }
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    // Fallback kalau gagal
    return res.json({
        success: false,
        message: 'Lagu tidak ditemukan. Coba link lain.'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on port', PORT);
});

module.exports = app;

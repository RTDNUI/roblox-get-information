const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

class RobloxPlayerAPI {
    constructor() {
        this.baseUrl = 'https://users.roblox.com/v1/users';
        this.thumbnailsUrl = 'https://thumbnails.roblox.com/v1/users/avatar-headshot';
    }

    async getPlayerInfo(userId) {
        try {
            const [userData, thumbnailData] = await Promise.all([
                this.fetchUserData(userId),
                this.fetchThumbnail(userId)
            ]);

            return {
                success: true,
                data: {
                    userId: userData.id,
                    username: userData.name,
                    displayName: userData.displayName,
                    description: userData.description,
                    created: userData.created,
                    isBanned: userData.isBanned,
                    profileUrl: `https://www.roblox.com/users/${userId}/profile`,
                    thumbnail: thumbnailData?.data[0]?.imageUrl || null
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getMultiplePlayersInfo(userIds) {
        try {
            const requests = userIds.map(userId => this.getPlayerInfo(userId));
            const results = await Promise.all(requests);
            
            return {
                success: true,
                players: results.map(result => result.data)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async fetchUserData(userId) {
        const response = await fetch(`${this.baseUrl}/${userId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        return await response.json();
    }

    async fetchThumbnail(userId) {
        const params = new URLSearchParams({
            userIds: userId,
            size: '150x150',
            format: 'png',
            isCircular: false
        });

        const response = await fetch(`${this.thumbnailsUrl}?${params}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch thumbnail: ${response.status}`);
        }
        
        return await response.json();
    }

    async searchPlayers(username, limit = 10) {
        try {
            const response = await fetch(`${this.baseUrl}/search?keyword=${encodeURIComponent(username)}&limit=${limit}`);
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                success: true,
                players: data.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

const robloxAPI = new RobloxPlayerAPI();

// Routes
app.get('/api/players/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const result = await robloxAPI.getPlayerInfo(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/players/batch', async (req, res) => {
    try {
        const { userIds } = req.body;
        const result = await robloxAPI.getMultiplePlayersInfo(userIds);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/players/search/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const result = await robloxAPI.searchPlayers(username, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Roblox Player API Server',
        endpoints: {
            '/api/players/:userId': 'GET - Get player info by UserId',
            '/api/players/batch': 'POST - Get multiple players info',
            '/api/players/search/:username': 'GET - Search players by username',
            '/health': 'GET - Health check'
        }
    });
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📚 API documentation available at http://localhost:${port}`);
});

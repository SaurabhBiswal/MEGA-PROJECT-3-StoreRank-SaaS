const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        tls: true, // Aiven Redis requires TLS
        rejectUnauthorized: false
    }
});

client.on('error', (err) => console.log('❌ Redis Client Error', err));
client.on('connect', () => console.log('✅ Connected to Redis Cloud'));

const connectRedis = async () => {
    try {
        await client.connect();
    } catch (err) {
        console.error('Redis Connection Failed:', err);
    }
};

module.exports = { client, connectRedis };

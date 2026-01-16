const redis = require('redis');
require('dotenv').config();

const url = process.env.REDIS_URL;
const isTLS = url?.startsWith('rediss://');

const client = redis.createClient({
    url: url,
    socket: isTLS ? {
        tls: true,
        rejectUnauthorized: false
    } : undefined
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

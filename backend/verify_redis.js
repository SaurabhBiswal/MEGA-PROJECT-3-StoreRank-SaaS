const { client, connectRedis } = require('./redisClient');

const testRedis = async () => {
    await connectRedis();

    try {
        await client.set('test_key', 'Redis is working! 🚀');
        const value = await client.get('test_key');
        console.log("✅ Redis Test Result:", value);
        process.exit(0);
    } catch (err) {
        console.error("❌ Redis Test Failed:", err);
        process.exit(1);
    }
};

testRedis();

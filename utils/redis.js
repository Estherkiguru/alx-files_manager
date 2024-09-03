const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    // Initialize Redis Client
    this.client = redis.createClient();

    // Handles any error on redis client
    this.client.on_connect('error', (err) => {
      console.error('redis client error', err);
    });

    // Promisify to use async/await
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  // Check if redis client connection is a success
  isAlive() {
    return this.client.connected;
  }

  // Get the Redis value stored for a key
  async get(key) {
    return this.getAsync(key);
  }

  // Set a key-value with an expiration
  async set(key, value, duration) {
    await this.setAsync(key, value, 'EX', duration);
  }

  // Delete a key
  async del(key) {
    await this.delAsync(key);
  }
}
// Create and export an instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;

import { createClient } from 'redis';
import config from '../config';

const redisClient = createClient({
    username: config.redis.username,
    password: config.redis.password,
    socket: {
        host:config.redis.host,
        port: config.redis.port
    }
});

export default redisClient;
import Redis, { RedisOptions } from 'ioredis';

export let redisClient: Redis | null = null;

export function connect(redisDetails: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const redisDetailsArr: string[] = redisDetails.split(':');
    const options: RedisOptions = {
      password: redisDetailsArr.length === 3 ? redisDetailsArr[0] : undefined,
      host: redisDetailsArr.length === 3 ? redisDetailsArr[1] : redisDetailsArr[0],
      port: parseInt(redisDetailsArr.length === 3 ? redisDetailsArr[2] : redisDetailsArr[1])
    };

    // Create the Redis client
    redisClient = new Redis(options);

    // Listen for the 'connect' event
    redisClient.on('connect', () => {
      resolve(true);
    });

    // Listen for the 'error' event
    redisClient.on('error', (err) => {
      reject(err);
    });
  });
}
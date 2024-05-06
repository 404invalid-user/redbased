import Redis, { RedisOptions } from 'ioredis';

export let redisClient: Redis | null = null;


export function connect(redisDetails: string | RedisOptions): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let options: RedisOptions | undefined;

    if (typeof redisDetails === 'string') {
      const redisDetailsArr: string[] = redisDetails.split(':');
      options = {
        password: redisDetailsArr.length === 3 ? redisDetailsArr[0] : undefined,
        host: redisDetailsArr.length === 3 ? redisDetailsArr[1] : redisDetailsArr[0],
        port: parseInt(redisDetailsArr.length === 3 ? redisDetailsArr[2] : redisDetailsArr[1])
      };
    } else {
      options = redisDetails;
    }

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
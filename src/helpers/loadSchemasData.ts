import Redis, { RedisOptions } from 'ioredis';




export default function loadSchemas(options: RedisOptions) {

  const redisClient = new Redis({
    port: options.port,
    host: options.host,
    username: options.username,
    password: options.password,
    db: 0,

  });
  return new Promise<boolean>((resolve, reject) => {
    redisClient.on('connect', () => {




      resolve(true);


    });
    redisClient.on('error', (err) => {
      reject(err);
    });
  });


}
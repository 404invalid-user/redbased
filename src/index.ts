import Redis, { RedisOptions } from 'ioredis';
import { SchemaConstructor } from './SchemaConstructor';
import { SchemaInstance } from './SchemaInstance';
export const Schema = SchemaConstructor;

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}
export class RedBased {
  redisClient: Redis | null = null;
  redisOptions: RedisOptions;
  schemas: any = {};

  constructor(config: RedisOptions) {
    if (config === null || config === undefined) {
      throw new Error("Config object is required.");
    }
    if (!config.port) {
      throw new Error("connection port is required.");
    }
    if (!isValidPort(config.port)) {
      throw new Error("connection port must be a valid port number between 1 and 65535.");
    }
    if (!config.host) {
      throw new Error("connection host is required.");
    }
    if (typeof config.host !== "string") {
      throw new Error("connection host must be a string.");
    }
    if (config.db === undefined) throw new Error("db is required.");

    if (config.db < 0) throw new Error("db cannot be a negative number.");
    if (config.db === 0) throw new Error("db cannot be 0 as that db will be used for this library's configuration and schemas");

    if (config.username !== undefined && typeof config.username !== "string") {
      throw new Error("Username, if defined, must be a string.");
    }
    if (config.password !== undefined && typeof config.password !== "string") {
      throw new Error("Password, if defined, must be a string.");
    }
    this.redisOptions = config;
  }

  connect(): Promise<boolean> {
    this.redisClient = new Redis(this.redisOptions);
    return new Promise<boolean>((resolve, reject) => {
      this.redisClient!.on('connect', () => {
        resolve(true);
      });
      this.redisClient!.on('error', (err) => {
        reject(err);
      });
    });
  }


  newSchema(schema: typeof SchemaConstructor) {
    if (this.schemas[schema.getName()] !== undefined) throw new Error("can not add schema " + schema.getName() + "as it exists");

    this.schemas[schema.getName()] = new SchemaInstance(this.redisClient, schema.getName(), schema.getFields())
  }


}
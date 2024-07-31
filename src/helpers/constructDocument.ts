import { Redis } from "ioredis";
import { Document, Fields } from "../../types/schema";
import pluralize from "./pluralize";
import * as crypto from "crypto";


export default async function constructDocument(redisClient: Redis | null, schemaName: string, doc: Document, fields: Fields, useCountForDefaultId: boolean = false) {
  if (redisClient === null) throw new Error("No Redis connection detected. Please await successful connection.");
  const resdoc = JSON.parse(JSON.stringify(doc));
  //if id null auto assign id
  if (resdoc.id == null || resdoc.id === undefined) {
    if (useCountForDefaultId === true) {
      const SchemaDocumentCount: number = await redisClient.hlen(pluralize(schemaName));
      resdoc.id = (SchemaDocumentCount + 1).toString();
    } else {
      resdoc.id = crypto.randomUUID().toString();
    }
  }

  //loop fields and add default value if value does not exist 
  for (const field in fields) {
    const { required, defaultValue } = fields[field];
    if (required) {
      if (resdoc[field] === null || resdoc[field] === undefined) {
        if (defaultValue !== undefined) {
          resdoc[field] = defaultValue;
        }
      }
    }
  }
  return resdoc;
}
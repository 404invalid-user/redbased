import { Document, Fields } from "../../types/schema";
import { redisClient } from "../redisClient";
import pluralize from "./pluralize";
//@ts-expect-error - it do be working anyway
import crypto from "crypto";


export default async function constructDocument(schemaName: string, doc: Document, fields: Fields, useCountForDefaultId: boolean = false) {
  if (redisClient === null) throw new Error("No Redis connection detected. Please await successful connection.");

  //if id null auto assign id
  if (doc.id == null || doc.id === undefined) {
    if (useCountForDefaultId === true) {
      const SchemaDocumentCount: number = await redisClient.hlen(pluralize(schemaName));
      doc.id = (SchemaDocumentCount + 1).toString();
    } else {
      doc.id = crypto.randomUUID().toString();
    }
  }

  //loop fields and add default value if value does not exist 
  for (const field in fields) {
    const { required, defaultValue } = fields[field];
    if (required) {
      if (doc[field] === null || doc[field] === undefined) {
        if (defaultValue) {
          doc[field] = defaultValue;
        }
      }
    }
  }
  return doc;
}
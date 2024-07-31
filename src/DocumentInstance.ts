import { Fields, Document } from '../types/schema';
import pluralize from './helpers/pluralize';
import documentValidation from './helpers/documentValidation';
import { Redis } from 'ioredis';

type MappedData = {
  id: string
  fields: Fields
  schema: string
  redisClient:Redis|null
};

export default class DocumentInstance {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Use type from Field
  private __data!: MappedData;

  constructor(redisClient:Redis|null, schemaName: string, data: Document, fields: Fields) {

    //"hides" backend object so user doesn't accidentally come across it in for loops etc 
    Object.defineProperty(this, '__data', {
      value: {
        id: data.id,
        schema: schemaName,
        fields: fields,
        redisClient: redisClient
      },
      enumerable: false
    });

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && fields[key]) {
        this[key] = data[key];
      }
    }
  }
  async delete(): Promise<boolean> {
    if (this.__data.redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    const schema: string = this.__data.schema;
    const deleteResult = await this.__data.redisClient.hdel(pluralize(schema), this.__data.id);
    if (deleteResult == 0) {
      throw new Error("could not delete doc with id '" + this.__data.id + "' as it does not exist anymore.");
    }
    this.nullify();
    return true;
  }

  async save(): Promise<boolean> {
    if (this.__data.redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    const schema: string = this.__data.schema;

    const validateDoc = documentValidation(this.toJSON(), this.__data.fields, false);
    if (validateDoc.pass === false) {
      throw new Error(validateDoc.msg);
    }
    const docString = JSON.stringify(this.toJSON());
    const deleteResult = await this.__data.redisClient.hdel(pluralize(schema), this.__data.id);
    if (deleteResult == 0) {
      throw new Error("could not update doc with id '" + this.__data.id + "' as it does not exist on the database anymore.");
    }

    if (this.__data.id !== this.id) {
      this.__data.id = this.id;
    }
    await this.__data.redisClient.hset(pluralize(schema), this.id, docString);
    return true;
  }

  toJSON(): Document {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = {};
    for (const key in this) {
      if (Object.prototype.hasOwnProperty.call(this, key) && key !== '__data' && typeof this[key] !== 'function') {
        json[key] = this[key];
      }
    }
    return json as Document;
  }

}

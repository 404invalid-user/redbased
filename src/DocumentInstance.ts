import { Fields, Document } from '../types/schema';
import { redisClient } from './redisClient';
import pluralize from './helpers/pluralize';
import documentValidation from './helpers/documentValidation';

type MappedData = {
  id: string
  fields: Fields
  schema: string
};

export default class DocumentInstance {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Use type from Field
  private __data!: MappedData;

  constructor(schemaName: string, data: Document, fields: Fields) {

    //"hides" backend object so user doesn't accidentally come across it in for loops etc 
    Object.defineProperty(this, '__data', {
      value: {
        id: data.id,
        schema: schemaName,
        fields: fields
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
    if (redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    const schema: string = this.__data.schema;
    const deleteResult = await redisClient.hdel(pluralize(schema), this.__data.id);
    if (deleteResult == 0) {
      throw new Error("could not delete doc with id '" + this.__data.id + "' as it does not exist anymore.");
    }
    this.nullify();
    return true;
  }

  async save(): Promise<boolean> {
    if (redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    const schema: string = this.__data.schema;

    const validateDoc = documentValidation(this.toJSON(), this.__data.fields, false);
    if (validateDoc.pass === false) {
      throw new Error(validateDoc.msg);
    }
    const docString = JSON.stringify(this.toJSON());
    const deleteResult = await redisClient.hdel(pluralize(schema), this.__data.id);
    if (deleteResult == 0) {
      throw new Error("could not update doc with id '" + this.__data.id + "' as it does not exist on the database anymore.");
    }

    if (this.__data.id !== this.id) {
      this.__data.id = this.id;
    }
    await redisClient.hset(pluralize(schema), this.id, docString);
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

  toString(): string {
    return `${this._data.schema} {${Object.entries(this).map(([key, value]) => typeof value === 'function' ? `${key}: function ${value.name}()` : key == '__data' ? '' : `${key}: ${value}`).join(', ')}}`;
  }
}

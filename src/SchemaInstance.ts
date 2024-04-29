import { Readable } from 'stream';
import { redisClient } from './redisClient';
import { Fields, Document } from '../types/schema';
import DocumentInstance from './DocumentInstance';
import pluralize from './helpers/pluralize';
import documentValidation from './helpers/documentValidation';
import constructDocument from './helpers/constructDocument';



class SchemaInstance {
  public name: string;
  private fields: Fields;

  constructor(name: string, fields: Fields) {
    //TODO: create document under schmea name with id SCHEMA to verify schema is correct and not changed - prevent functions and things returning this document - warn user in docs this is created and their other lang apps should ignore it too (-1 from length, dont include in stream etc)
    //TODO: use own custom schema to save these instead
    //TODO: mass document schema format update
    //TODO: prevent multible schemas with same name created

    if (this == undefined) throw new Error("Ensure you define a SchemaInstance with new, 'const x = new Schema() not const x = Schema'");

    this.name = name;

    // add 'id' field
    this.fields = {
      id: {
        required: true,
        type: String,
      },
      ...fields,
    };

    // Check for duplicate keys
    const fieldKeys = Object.keys(fields);
    const uniqueKeys = new Set(fieldKeys);
    if (fieldKeys.length !== uniqueKeys.size) {
      throw new Error('Duplicate keys are not allowed in the fields definition.');
    }

    // Check for keys starting with '__'
    const invalidKeys = fieldKeys.filter(key => key.startsWith('__'));
    if (invalidKeys.length > 0) {
      throw new Error('Keys starting with "__" are reserved for internal use and not allowed.');
    }

    // Filter out unnecessary properties
    for (const field in this.fields) {
      const { required, type, defaultValue } = this.fields[field];
      this.fields[field] = {
        required: required === true ? true : false,
        type: type || String,
        defaultValue,
      };
    }

    // Validate fields
    for (const field in this.fields) {
      const { type, required, defaultValue } = this.fields[field];

      // Validate required
      if (required !== undefined && typeof required !== 'boolean') {
        throw new Error(`'required' must be a boolean for field '${field}' in schema '${this.name}'.`);
      }

      // Default 'required' to false if not provided
      this.fields[field].required = required !== undefined ? required : false;

      //TODO: expand supported types of data
      // Validate type
      const allowedTypes = ['String', 'Number', 'Boolean', 'Object'];
      if (!type || !allowedTypes.includes(type.name)) {
        throw new Error(`Invalid 'type' for field '${field}'.`);
      }

      // Validate defaultValue
      if (defaultValue !== undefined && typeof defaultValue !== type.name.toLowerCase()) {
        throw new Error(`'defaultValue' must match the specified 'type' for field '${field}' in '${this.name}' schema.`);
      }
    }
  }



  // SECTION - public functions

  public async create(data: Document): Promise<Document> {
    if (redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    const documentData = await constructDocument(this.name, data, this.fields);
    const validateDoc = documentValidation(data, this.fields, false);

    if (validateDoc.pass === false) throw new Error(validateDoc.msg);

    //TODO: get default value from schema and fillin if null
    // Convert the filtered data object to a string
    const docString = JSON.stringify(documentData);

    //check for dupe id
    const idExistCheck: string | null = await redisClient.hget(pluralize(this.name), documentData.id);
    if (idExistCheck !== null) throw new Error("a document with that id exists");

    // Save the data to Redis
    await redisClient.hset(pluralize(this.name), documentData.id, docString);
    return data;
  }


  public async findById(id: string | number): Promise<DocumentInstance | null> {
    if (!id || id == null || id == undefined) throw new Error("an id must be provided");
    if (redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    const value: string | null = await redisClient.hget(pluralize(this.name), id.toString());
    if (value === undefined || value === null) return null;
    const dataObject = JSON.parse(value);
    return new DocumentInstance(this.name, dataObject, this.fields);
  }

  /**
   * create a stream to find one or many based on a filter
   * @param filterObject - obj based on schema to filter by
   * @param limit - limit of documents to be returned by stream at once (100 to 400) 200 is sweatspot no matter how large each doc is
   * @param raw - if each document should return the raw obj or a DocumentInstance (contains save delete functions)
   * @returns {Stream}
   */
  public async find(filterObject: Document | null, limit: number = 200, raw: boolean = false): Promise<Readable> {

    const validateDoc = documentValidation(filterObject, this.fields, true);
    if (validateDoc.pass = false) throw new Error(validateDoc.msg);

    if (redisClient === null) throw new Error("No Redis connection detected. Please await successful connection.");



    const SchemaDocumentCount: number = await redisClient.hlen(pluralize(this.name));
    let foundDocumentsArr: DocumentInstance[] = [];
    let processedDocuments: number = 0;


    // Create a readable stream to emit the matching documents
    const readableStream = new Readable({
      objectMode: true,
      read() { }
    });


    /** check if a document fits the filter */
    function checkInFilter(doc: Document): boolean {
      if (filterObject === null || filterObject === undefined || Object.keys(filterObject).length === 0) {
        return true;
      }

      const filterKeys = Object.keys(filterObject);
      for (const key of filterKeys) {
        if (!(key in doc)) {
          return false;
        }
        // Check if the values of the keys are equal
        if (filterObject[key] !== doc[key]) {
          return false;
        }
      }
      return true;
    }


    /** construct the document json */
    function constructDocInStream(id: string, value: string) {
      const valueJson = JSON.parse(value);
      if (valueJson.id != id) valueJson.id = id;
      processedDocuments++;
      return valueJson;
    }
    /** push and reset local array */
    function pushAndResetArray() {
      if (foundDocumentsArr.length <= 0) return false;
      readableStream.push(foundDocumentsArr);
      foundDocumentsArr = [];
      return true;
    }

    const schemaName = this.name;
    const fields = this.fields;

    /** handle the redis stream */
    function handleRedisStreamData(results: string[]) {
      //return empyty arr and end stream if lenght 0
      if (results.length <= 0) {
        readableStream.push([]);
        return readableStream.push(null);;
      }

      for (let i = 0; i < results.length; i += 2) {
        const doc = constructDocInStream(results[i], results[i + 1]);

        //check if doc in filter and add to our temp aray
        if (checkInFilter(doc) === true) {
          if (raw == true) foundDocumentsArr.push(doc);
          if (raw == false) foundDocumentsArr.push(new DocumentInstance(schemaName, doc, fields));
        }

        //check if we should emit the local array to stream
        if (foundDocumentsArr.length >= limit || foundDocumentsArr.length >= SchemaDocumentCount) {
          pushAndResetArray();
        }




        //push rest of docs if any and end stream when finished processing all documents
        if (processedDocuments >= SchemaDocumentCount) {
          pushAndResetArray();
          readableStream.push(null);
        }
      }
    }
    //redis stream
    const schemaStream = redisClient.hscanStream(pluralize(this.name), { count: limit });
    schemaStream.on('data', handleRedisStreamData);
    schemaStream.on('error', (err) => {
      // If an error occurs, emit the error on the readable stream
      readableStream.emit('error', err);
    });

    return readableStream;
  }

  public async size(filterObject: Document | null): Promise<number> {
    if (redisClient === null) throw new Error("No Redis connection detected. Please await successful connection.");
    let size: number = 0;
    if (filterObject === null || filterObject === undefined || Object.keys(filterObject).length === 0) {
      size = await redisClient.hlen(pluralize(this.name));
      return size;
    }
    const sizeStream = await this.find(filterObject, 300, true);
    return new Promise((res, rej) => {
      sizeStream.on('data', docs => size += docs.lenght);
      sizeStream.on('end', () => {
        res(size);
      });
      sizeStream.on('error', (error) => {
        rej(error);
      });
    });
  }

  public async delete(id: string): Promise<boolean> {
    if (redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    if (!id || id == null || id == undefined) throw new Error("id must be defined to delete");
    await redisClient.hdel(pluralize(this.name), id);
    return true;
  }
}

export const Schema = SchemaInstance;

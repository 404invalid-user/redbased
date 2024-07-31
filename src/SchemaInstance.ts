import { Readable } from 'stream';
import { Fields, Document } from '../types/schema';
import DocumentInstance from './DocumentInstance';
import pluralize from './helpers/pluralize';
import documentValidation from './helpers/documentValidation';
import constructDocument from './helpers/constructDocument';
import { Redis } from 'ioredis';



export class SchemaInstance {
  public name: string;
  private fields: Fields;
  private redisClient: Redis | null = null;

  constructor(redisClient: Redis|null, name: string, fields: Fields) {
    if (redisClient === null) throw new Error("can not add schema " + name + " as there is no redis connection");
    this.redisClient = redisClient;
    this.name = name;
    this.fields = fields;
  }



  // SECTION - public functions

  public async create(data: Document): Promise<Document> {
    if (this.redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    const documentData = await constructDocument(this.redisClient, this.name, data, this.fields);
    const validateDoc = documentValidation(data, this.fields, false);
    if (validateDoc.pass === false) {
      const err = new Error(`Failed to create ${this.name} ${validateDoc.msg}`);
      Error.captureStackTrace(err);
      throw err;
    }

    // Convert the filtered data object to a string
    const docString = JSON.stringify(documentData);

    //check for dupe id
    const idExistCheck: string | null = await this.redisClient.hget(pluralize(this.name), documentData.id);
    if (idExistCheck !== null) throw new Error("a document with that id exists");

    // Save the data to Redis
    await this.redisClient.hset(pluralize(this.name), documentData.id, docString);
    return new DocumentInstance(this.redisClient, this.name, documentData, this.fields);
  }


  public async findById(id: string | number): Promise<DocumentInstance | null> {
    if (!id || id == null || id == undefined) {
      const err = new Error("an id must be provided");
      Error.captureStackTrace(err, this.findById);
      throw err;
    }
    if (this.redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    const value: string | null = await this.redisClient.hget(pluralize(this.name), id.toString());
    if (value === undefined || value === null) return null;
    const dataObject = JSON.parse(value);
    return new DocumentInstance(this.redisClient, this.name, dataObject, this.fields);
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
    if (validateDoc.pass = false) throw new Error(`failed to find ${this.name} ${validateDoc.msg}`);

    if (this.redisClient === null) throw new Error("No Redis connection detected. Please await successful connection.");



    const SchemaDocumentCount: number = await this.redisClient.hlen(pluralize(this.name));
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
      //NOTE - push an empy array before stream close incase there was no items
      //if (foundDocumentsArr.length <= 0) return false;
      readableStream.push(foundDocumentsArr);
      foundDocumentsArr = [];
      return true;
    }


    /** handle the redis stream */
    const handleRedisStreamData = (results: string[]) => {
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
          if (raw == false) foundDocumentsArr.push(new DocumentInstance(this.redisClient, this.name, doc, this.fields));
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
    const schemaStream = this.redisClient.hscanStream(pluralize(this.name), { count: limit });
    schemaStream.on('data', handleRedisStreamData);
    schemaStream.on('error', (err) => {
      // If an error occurs, emit the error on the readable stream
      readableStream.emit('error', err);
    });

    return readableStream;
  }

  public async findOne(filterObject: Document | null, raw: boolean = false): Promise<Document | null> {
    const findStream = await this.find(filterObject, 300, raw);
    return new Promise((res, rej) => {
      findStream.on('data', (results) => {
        if (results.length <= 0) return res(null);
        return res(results[0]);
      });
      findStream.on('close', () => {
        return res(null);
      })
      findStream.on('error', (err) => rej(err));
    })
  }

  public async size(filterObject: Document | null): Promise<number> {
    if (this.redisClient === null) throw new Error("No Redis connection detected. Please await successful connection.");
    let size: number = 0;
    if (filterObject === null || filterObject === undefined || Object.keys(filterObject).length === 0) {
      size = await this.redisClient.hlen(pluralize(this.name));
      return size;
    }
    const sizeStream = await this.find(filterObject, 300, true);
    return new Promise((res, rej) => {
      sizeStream.on('data', docs => {
        size += docs.length;
      });
      sizeStream.on('end', () => {
        res(size);
      });
      sizeStream.on('error', (error) => {
        rej(error);
      });
    });
  }

  public async delete(id: string): Promise<boolean> {
    if (this.redisClient === null) throw new Error("no redis connection detected please first await successfull connection");
    if (!id || id == null || id == undefined) throw new Error("id must be defined to delete");
    await this.redisClient.hdel(pluralize(this.name), id);
    return true;
  }
}
import { Fields } from '../types/schema';



export class SchemaConstructor {
  public name: string;
  private fields: Fields;

  constructor(name: string, fields: Fields) {
    //TODO: create document under schmea name with id SCHEMA to verify schema is correct and not changed - prevent functions and things returning this document - warn user in docs this is created and their other lang apps should ignore it too (-1 from length, dont include in stream etc)
    //TODO: use own custom schema to save these instead
    //TODO: mass document schema format update
    //TODO: prevent multible schemas with same name created
    //TODO: fix error stack trace not working only traces back to this function not what called this function

    if (this == undefined) throw new Error(`Could not cunstruct ${name} Schema Ensure you define a SchemaInstance with new, 'const x = new Schema() not const x = Schema'`);

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
      throw new Error(`Could not cunstruct ${this.name} Schema Duplicate keys are not allowed in the fields definition.`);
    }

    // Check for keys starting with '__'
    const invalidKeys = fieldKeys.filter(key => key.startsWith('__'));
    if (invalidKeys.length > 0) {
      throw new Error(`Could not cunstruct ${this.name} Schema Keys starting with "__" are reserved for internal use and not allowed.`);
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
        throw new Error(`Could not construct ${this.name} Schema 'required' must be a boolean for field '${field}' in schema '${this.name}'.`);
      }

      // Default 'required' to false if not provided
      this.fields[field].required = required !== undefined ? required : false;

      //TODO: expand supported types of data
      // Validate type
      const allowedTypes = ['String', 'Number', 'Boolean', 'Object'];
      if (!type || !allowedTypes.includes(type.name)) {
        throw new Error(`Could not cunstruct ${this.name} Schema Invalid 'type' for field '${field}'.`);
      }

      // Validate defaultValue
      if (defaultValue !== undefined && typeof defaultValue !== type.name.toLowerCase()) {
        throw new Error(`Could not cunstruct ${this.name} Schema  'defaultValue' must match the specified 'type' for field '${field}' in '${this.name}' schema.`);
      }
    }
  }



  // SECTION - public functions



  getName() {
    return this.name;
  }

  getFields() {
    return this.fields;
  }
}

import { Document, Fields } from "../../types/schema";

function capitalizeFirstLetter(string: string): string {
  return string[0].toUpperCase() + string.slice(1);
}

function getTypeAsString(value): string {
  return value.name || 'undefined';
}

function documentValidation(doc: Document | null = null, validationFeilds: Fields, isFilter: boolean = false) {

  if ((doc == null || doc.length === 0) && isFilter == true) return {
    pass: true,
    msg: "doc is null"
  }
  if (doc == null) return {
    pass: false,
    msg: "doc is null"
  }

  //has id
  //TODO: docs will auto gen an id and return on ceration if one not specified
  if (!doc.id && isFilter == false) {
    throw new Error("Document must have an 'id' type string field.");
  }

  //does not contain extra unknown keys
  if (doc !== null) {
    for (const key of Object.keys(doc)) {
      if (!(key in validationFeilds)) {
        return {
          pass: false,
          msg: `Schema does not contain field '${key}'.`
        }
      }
    }
  }


  //contains all keys and required ones
  for (const field in validationFeilds) {
    const { type, required, defaultValue } = validationFeilds[field];

    //required docs must be defined if no defaultValue defined
    if (required && (doc[field] === undefined || doc[field] === null) && (defaultValue == null || defaultValue == undefined)) {
      return {
        pass: false,
        msg: `Field '${field}' is required.`
      }
    }


    //valid data type
    const typeStr: string = getTypeAsString(type);
    const typeOfSupplyData: string = capitalizeFirstLetter(typeof doc[field]);
    if (typeOfSupplyData !== typeStr) {
      if (required === false && typeOfSupplyData !== "Undefined") {
        return {
          pass: false,
          msg: `Field '${field}' must be of type '${typeStr}' ${required === false ? "or 'undefined'": ''}.`
        }
      }
    }
  }
  return {
    pass: true,
    msg: 'pass'
  }
}


export default documentValidation;

//let schemas: Schema[] = [];
const names: string[] = [];

export function addSchemaName(schemaName: string) {

  const isExists = checkSchemaExists(schemaName);
  if (isExists===true) {
    throw new Error("the schema '"+schemaName+"' is already defined");
  }
  names.push(schemaName);
  return schemaName;
}

export function checkSchemaExists(schemaName:string): boolean {
  if (names.includes(schemaName)) return true;
  return false;
}
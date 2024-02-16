export interface Field {
  required?: boolean;
  type: StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor;
  defaultValue?: never;
}

export interface Fields {
  [key: string]: Field;
}

type Document = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/repository-json-schema
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  ModelMetadataHelper,
  PropertyDefinition,
  ModelDefinition,
} from '@loopback/repository';
import {MetadataInspector} from '@loopback/context';
import {
  JSONSchema6 as JSONSchema,
  JSONSchema6TypeName as JSONSchemaTypeName,
} from 'json-schema';
import {JSON_SCHEMA_KEY} from './keys';

/**
 * Gets the JSON Schema of a TypeScript model/class by seeing if one exists
 * in a cache. If not, one is generated and then cached.
 * @param ctor Contructor of class to get JSON Schema from
 */
export function getJsonSchema(ctor: Function): JSONSchema {
  // NOTE(shimks) currently impossible to dynamically update
  const jsonSchema = MetadataInspector.getClassMetadata(JSON_SCHEMA_KEY, ctor);
  if (jsonSchema) {
    return jsonSchema;
  } else {
    const newSchema = modelToJsonSchema(ctor);
    MetadataInspector.defineMetadata(JSON_SCHEMA_KEY.key, newSchema, ctor);
    return newSchema;
  }
}

/**
 * Gets the wrapper function of primitives string, number, and boolean
 * @param type Name of type
 */
export function stringTypeToWrapper(type: string | Function): Function {
  if (typeof type === 'function') {
    return type;
  } else {
    type = type.toLowerCase();
    let wrapper;
    switch (type) {
      case 'number': {
        wrapper = Number;
        break;
      }
      case 'string': {
        wrapper = String;
        break;
      }
      case 'boolean': {
        wrapper = Boolean;
        break;
      }
      case 'array': {
        wrapper = Array;
        break;
      }
      case 'object': {
        wrapper = Object;
        break;
      }
      case 'date': {
        wrapper = Date;
        break;
      }
      case 'buffer': {
        wrapper = Buffer;
        break;
      }
      default: {
        throw new Error('Unsupported type: ' + type);
      }
    }
    return wrapper;
  }
}

/**
 * Determines whether the given constructor is a custom type or not
 * @param ctor Constructor
 */
export function isComplexType(ctor: Function) {
  return !([
    String,
    Number,
    Boolean,
    Object,
    Function,
    Array,
  ] as Function[]).includes(ctor);
}

/**
 * Converts property metadata into a JSON property definition
 * @param meta
 */
export function metaToJsonProperty(meta: PropertyDefinition): JSONSchema {
  // tslint:disable-next-line:no-any
  let ctor = meta.type as string | Function | Array<string | Function>;
  const propDef: JSONSchema = {};
  let result: JSONSchema;

  // NOTE(shimks): this area can be tweaked so that array of multiple types
  // can be supported
  if (Array.isArray(ctor)) {
    if (ctor.length !== 1) {
      throw new Error('type is not an array of length 1');
    }
    ctor = ctor[0];
    result = {type: 'array', items: propDef};
  } else {
    result = propDef;
  }

  ctor = stringTypeToWrapper(ctor);

  if (isComplexType(ctor)) {
    Object.assign(propDef, {$ref: `#/definitions/${ctor.name}`});
  } else {
    Object.assign(propDef, {type: <JSONSchemaTypeName>ctor.name.toLowerCase()});
  }

  return result;
}

// NOTE(shimks) no metadata for: union, optional, nested array, any, enum,
// string literal, anonymous types, and inherited properties

/**
 * Converts a TypeScript class into a JSON Schema using TypeScript's
 * reflection API
 * @param ctor Constructor of class to convert from
 */
export function modelToJsonSchema(ctor: Function): JSONSchema {
  const meta: ModelDefinition | {} = ModelMetadataHelper.getModelMetadata(ctor);
  const result: JSONSchema = {};

  // returns an empty object if metadata is an empty object
  if (!(meta instanceof ModelDefinition)) {
    return {};
  }

  result.title = meta.title || ctor.name;

  if (meta.description) {
    result.description = meta.description;
  }

  for (const p in meta.properties) {
    if (!meta.properties[p].type) {
      continue;
    }

    result.properties = result.properties || {};

    const metaProperty = Object.assign({}, meta.properties[p]);

    // clone property metadata and convert types represented by strings into the
    // appropriate wrapper type
    if (Array.isArray(metaProperty.type)) {
      metaProperty.type = metaProperty.type.map(type =>
        stringTypeToWrapper(type),
      );
    } else {
      metaProperty.type = stringTypeToWrapper(metaProperty.type as
        | Function
        | string);
    }

    // populating "properties" key
    result.properties[p] = metaToJsonProperty(metaProperty);

    // populating JSON Schema 'definitions'
    let metaType = metaProperty.type;
    if (
      (typeof metaType === 'function' && isComplexType(metaType)) ||
      (Array.isArray(metaType) && isComplexType(metaType[0]))
    ) {
      if (Array.isArray(metaType)) {
        metaType = metaType[0];
      }
      const propSchema = getJsonSchema(metaType as Function);

      if (propSchema && Object.keys(propSchema).length > 0) {
        result.definitions = result.definitions || {};

        // delete nested definition
        if (propSchema.definitions) {
          for (const key in propSchema.definitions) {
            result.definitions[key] = propSchema.definitions[key];
          }
          delete propSchema.definitions;
        }

        result.definitions[(metaType as Function).name] = propSchema;
      }
    }

    // handling 'required' metadata
    if (metaProperty.required) {
      result.required = result.required || [];
      result.required.push(p);
    }
  }
  return result;
}

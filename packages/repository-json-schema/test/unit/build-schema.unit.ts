// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/repository-json-schema
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {isComplexType, stringTypeToWrapper, metaToJsonProperty} from '../..';

describe('build-schema', () => {
  describe('stringTypeToWrapper', () => {
    it('returns respective wrapper of number, string, boolean, array, buffer, date and object', () => {
      expect(stringTypeToWrapper('string')).to.eql(String);
      expect(stringTypeToWrapper('number')).to.eql(Number);
      expect(stringTypeToWrapper('boolean')).to.eql(Boolean);
      expect(stringTypeToWrapper('array')).to.eql(Array);
      expect(stringTypeToWrapper('buffer')).to.eql(Buffer);
      expect(stringTypeToWrapper('date')).to.eql(Date);
      expect(stringTypeToWrapper('object')).to.eql(Object);
    });

    it('errors out if other types are given', () => {
      expect(() => {
        stringTypeToWrapper('arbitraryType');
      }).to.throw(/Unsupported type/);
      expect(() => {
        stringTypeToWrapper('function');
      }).to.throw(/Unsupported type/);
    });
  });

  describe('isComplextype', () => {
    it('returns false if primitive or object wrappers are passed in', () => {
      expect(isComplexType(Number)).to.eql(false);
      expect(isComplexType(String)).to.eql(false);
      expect(isComplexType(Boolean)).to.eql(false);
      expect(isComplexType(Object)).to.eql(false);
      expect(isComplexType(Function)).to.eql(false);
      expect(isComplexType(Array)).to.eql(false);
    });

    it('returns true if any other wrappers are passed in', () => {
      class CustomType {}
      expect(isComplexType(CustomType)).to.eql(true);
    });
  });

  describe('metaToJsonSchema', () => {
    it('errors out if "type" property is an empty array', () => {
      expect(() => metaToJsonProperty({type: []})).to.throw(
        /type is not an array of length 1/,
      );
    });

    it('errors out if "type" property is an array of length > 1', () => {
      expect(() => metaToJsonProperty({type: [Number, String]})).to.throw(
        /type is not an array of length 1/,
      );
    });

    it('converts types in strings', () => {
      expect(metaToJsonProperty({type: 'number'})).to.eql({
        type: 'number',
      });
    });

    it('converts primitives', () => {
      expect(metaToJsonProperty({type: Number})).to.eql({
        type: 'number',
      });
    });

    it('converts arrays', () => {
      expect(metaToJsonProperty({type: Array})).to.eql({
        type: 'array',
      });
    });

    it('converts complex types', () => {
      class CustomType {}
      expect(metaToJsonProperty({type: CustomType})).to.eql({
        $ref: '#/definitions/CustomType',
      });
    });

    it('converts primitive arrays', () => {
      expect(metaToJsonProperty({type: [Number]})).to.eql({
        type: 'array',
        items: {type: 'number'},
      });
    });

    it('converts arrays of custom types', () => {
      class CustomType {}
      expect(metaToJsonProperty({type: [CustomType]})).to.eql({
        type: 'array',
        items: {$ref: '#/definitions/CustomType'},
      });
    });
  });
});

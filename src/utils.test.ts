import { areObjectPropertiesEqual } from './utils'

describe('areObjectPropertiesEqual', () => {
  it('should return true for equal objects', () => {
    const expected = { a: 1, b: { c: 2 } };
    const actual = { a: 1, b: { c: 2 } };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(true);
  });

  it('should return false for objects with different properties', () => {
    const expected = { a: 1, b: { c: 2 } };
    const actual = { a: 1, b: { c: 3 } };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(false);
  });

  it('should return false if actual is missing a property', () => {
    const expected = { a: 1, b: 2 };
    const actual = { a: 1 };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(false);
  });

  it('should return true for objects with additional properties in actual', () => {
    const expected = { a: 1 };
    const actual = { a: 1, b: 2 };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(true);
  });

  it('should handle nested objects recursively', () => {
    const expected = { a: 1, b: { c: { d: 2 } } };
    const actual = { a: 1, b: { c: { d: 2 } } };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(true);
  });

  it('should return false for nested objects with different values', () => {
    const expected = { a: 1, b: { c: { d: 2 } } };
    const actual = { a: 1, b: { c: { d: 3 } } };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(false);
  });

  it('should return false for non-object input', () => {
    const expected = { a: 1, b: { c: 2 } };
    const actual = 'not an object';

    expect(areObjectPropertiesEqual(expected, actual)).toBe(false);
  });

 it('should return true for equal objects with string and boolean values', () => {
    const expected = { a: 'hello', b: true, c: { d: 'world', e: false } };
    const actual = { a: 'hello', b: true, c: { d: 'world', e: false } };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(true);
  });

  it('should return false for objects with different string and boolean values', () => {
    const expected = { a: 'hello', b: true, c: { d: 'world', e: false } };
    const actual = { a: 'hi', b: false, c: { d: 'world', e: true } };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(false);
  });

  it('should return true for equal objects with mixed value types', () => {
    const expected = { a: 'hello', b: 42, c: { d: true, e: { f: 'world' } } };
    const actual = { a: 'hello', b: 42, c: { d: true, e: { f: 'world' } } };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(true);
  });

  it('should return false for objects with different mixed value types', () => {
    const expected = { a: 'hello', b: 42, c: { d: true, e: { f: 'world' } } };
    const actual = { a: 'hi', b: 42, c: { d: false, e: { f: 'universe' } } };

    expect(areObjectPropertiesEqual(expected, actual)).toBe(false);
  });

});

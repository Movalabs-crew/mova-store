import { describe, it, expect } from 'vitest';
import { hexToBytes, bytesToHex, bytes32ToScVal } from '../lib/stellar/scval';

describe('hexToBytes & bytesToHex', () => {
  it('should parse valid hex strings with and without 0x prefix', () => {
    const b1 = hexToBytes('0x12abef');
    expect(bytesToHex(b1)).toBe('12abef');

    const b2 = hexToBytes('12abef');
    expect(bytesToHex(b2)).toBe('12abef');
  });

  it('should handle case-insensitively and emit lowercase hex', () => {
    expect(bytesToHex(hexToBytes('a1B2c3'))).toBe('a1b2c3');
  });

  it('should return empty Uint8Array for empty string', () => {
    expect(hexToBytes('')).toEqual(new Uint8Array(0));
    expect(hexToBytes('0x')).toEqual(new Uint8Array(0));
  });

  it('should throw error for odd-length hex strings', () => {
    expect(() => hexToBytes('abc')).toThrow('invalid hex string (odd length)');
    expect(() => hexToBytes('0x123')).toThrow('invalid hex string (odd length)');
  });

  it('should throw error for non-hex characters', () => {
    expect(() => hexToBytes('gggg')).toThrow(/invalid hex character/);
    expect(() => hexToBytes('0xzz')).toThrow(/invalid hex character/);
    expect(() => hexToBytes('123g')).toThrow(/invalid hex character/);
  });
});

describe('bytes32ToScVal', () => {
  it('should build ScVal from valid 32-byte hex string', () => {
    const validHex = 'aa'.repeat(32);
    const scval = bytes32ToScVal(validHex);
    expect(scval).toBeDefined();
  });

  it('should throw when non-hex string is passed', () => {
    const invalidHex = 'gg'.repeat(32);
    expect(() => bytes32ToScVal(invalidHex)).toThrow(/invalid hex character/);
  });

  it('should throw when byte length is not exactly 32', () => {
    expect(() => bytes32ToScVal('aa'.repeat(16))).toThrow(/expected 32 bytes/);
    expect(() => bytes32ToScVal(new Uint8Array(10))).toThrow(/expected 32 bytes/);
  });
});

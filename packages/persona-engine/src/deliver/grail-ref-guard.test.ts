/**
 * grail-ref-guard tests · V0.7-A.3 sprint Task 1.9.
 *
 * Verifies:
 *   - canonical refs (`@g876`) are recognized as valid
 *   - unknown refs (`@g99999`) flagged as invalid
 *   - mixed canonical/unknown/hash refs partition correctly
 *   - text with no refs returns empty lists
 *   - sessionRefs override allows per-session-canonical refs
 *   - footer composer appends warning on invalid > 0, leaves text alone otherwise
 */

import { describe, test, expect } from 'bun:test';
import {
  appendGrailRefGuardFooter,
  GRAIL_REF_GUARD_FOOTER,
  validateGrailRefs,
} from './grail-ref-guard.ts';

describe('validateGrailRefs · canonical refs', () => {
  test('canonical @g876 returns valid singleton', () => {
    const result = validateGrailRefs('see @g876 black hole');
    expect(result.valid).toEqual(['@g876']);
    expect(result.invalid).toEqual([]);
  });

  test('canonical @g4488 (Hermes) returns valid', () => {
    const result = validateGrailRefs('hermes is @g4488');
    expect(result.valid).toEqual(['@g4488']);
    expect(result.invalid).toEqual([]);
  });
});

describe('validateGrailRefs · unknown refs', () => {
  test('unknown @g99999 flagged as invalid', () => {
    const result = validateGrailRefs('see @g99999 fake grail');
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['@g99999']);
  });

  test('unknown @g123 flagged as invalid', () => {
    const result = validateGrailRefs('@g123 unknown');
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['@g123']);
  });
});

describe('validateGrailRefs · mixed refs', () => {
  test('canonical + unknown + hash partition correctly', () => {
    const result = validateGrailRefs(
      'compare @g876 with @g99999 and #4488',
    );
    expect(result.valid).toContain('@g876');
    expect(result.valid).toContain('#4488');
    expect(result.invalid).toContain('@g99999');
    expect(result.valid.length).toBe(2);
    expect(result.invalid.length).toBe(1);
  });

  test('duplicate refs deduped within shape', () => {
    const result = validateGrailRefs(
      '@g876 first and @g876 again',
    );
    expect(result.valid).toEqual(['@g876']);
  });

  test('@g876 and #876 are distinct citation forms', () => {
    const result = validateGrailRefs('@g876 vs #876');
    expect(result.valid).toContain('@g876');
    expect(result.valid).toContain('#876');
    expect(result.valid.length).toBe(2);
  });
});

describe('validateGrailRefs · no-ref text', () => {
  test('plain text returns empty validation', () => {
    const result = validateGrailRefs('the chain has held.');
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  test('empty string returns empty validation', () => {
    const result = validateGrailRefs('');
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
  });
});

describe('validateGrailRefs · sessionRefs override', () => {
  test('sessionRefs allows non-canonical id', () => {
    const result = validateGrailRefs('see @g99999', ['@g99999']);
    expect(result.valid).toEqual(['@g99999']);
    expect(result.invalid).toEqual([]);
  });

  test('sessionRefs work with bare-id form', () => {
    const result = validateGrailRefs('see @g7777', ['7777']);
    expect(result.valid).toEqual(['@g7777']);
    expect(result.invalid).toEqual([]);
  });

  test('sessionRefs and canonical compose', () => {
    const result = validateGrailRefs(
      '@g876 and @g7777 and @g99999',
      ['@g7777'],
    );
    expect(result.valid).toContain('@g876');
    expect(result.valid).toContain('@g7777');
    expect(result.invalid).toEqual(['@g99999']);
  });
});

describe('appendGrailRefGuardFooter', () => {
  test('appends footer when invalid refs surfaced', () => {
    const result = appendGrailRefGuardFooter('see @g99999');
    expect(result.text).toContain('@g99999');
    expect(result.text).toContain('KEEPER: contains unverified ref');
    expect(result.text.endsWith(GRAIL_REF_GUARD_FOOTER)).toBe(true);
    expect(result.validation.invalid).toEqual(['@g99999']);
  });

  test('leaves text unchanged when all refs canonical', () => {
    const original = 'see @g876 and @g4488';
    const result = appendGrailRefGuardFooter(original);
    expect(result.text).toBe(original);
    expect(result.validation.invalid).toEqual([]);
  });

  test('leaves text unchanged when no refs at all', () => {
    const original = 'the chain has held.';
    const result = appendGrailRefGuardFooter(original);
    expect(result.text).toBe(original);
  });
});

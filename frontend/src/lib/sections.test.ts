import { describe, expect, it } from 'vitest';
import { normalizeSectionInput, toMappingResult } from './sections';

describe('normalizeSectionInput', () => {
  it('strips the prefixes people actually type', () => {
    expect(normalizeSectionInput(' ipc 420 ')).toBe('420');
    expect(normalizeSectionInput('Sec. 302')).toBe('302');
    expect(normalizeSectionInput('section 498a')).toBe('498A');
    expect(normalizeSectionInput('#376')).toBe('376');
  });

  it('returns an empty string for input with no section in it', () => {
    expect(normalizeSectionInput('   ')).toBe('');
    expect(normalizeSectionInput('IPC')).toBe('');
  });
});

describe('toMappingResult', () => {
  it('reports a numbered successor as an equivalent', () => {
    const result = toMappingResult({ ipc: '302', bns: '103(1)', description: 'Punishment for murder' });
    expect(result.outcome).toBe('equivalent');
    expect(result.bnsSection).toBe('103(1)');
  });

  it('separates "no successor in the new code" from "not in the index"', () => {
    expect(toMappingResult({ ipc: '1', bns: 'N/A', description: 'Introduction' }).outcome).toBe(
      'no-equivalent',
    );
    expect(toMappingResult({ ipc: '9999', bns: 'Not Found' }).outcome).toBe('unindexed');
  });

  it('never invents punishment or bail details for an unreviewed section', () => {
    // The /map endpoint returns a section number and a description only. Anything
    // else must stay undefined rather than defaulting — a guessed "Non-bailable"
    // badge would read as a statement of law the app cannot support.
    const result = toMappingResult({ ipc: '341', bns: '137', description: 'Wrongful restraint' });
    expect(result.reviewed).toBe(false);
    expect(result.punishment).toBeUndefined();
    expect(result.cognizable).toBeUndefined();
    expect(result.bailable).toBeUndefined();
  });

  it('uses reviewed notes when the section has them', () => {
    const result = toMappingResult({ ipc: '302', bns: '103(1)' });
    expect(result.reviewed).toBe(true);
    expect(result.cognizable).toBe(true);
    expect(result.bailable).toBe(false);
    expect(result.punishment).toMatch(/imprisonment/i);
  });
});

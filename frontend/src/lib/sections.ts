import type { ApiMappingResult, LegalSection } from '../types';

/**
 * Size of the IPC → BNS index, mirroring `backend/ipc_bns_map.py`.
 *
 * These are stated on the landing page, so they must stay honest. Verified
 * against the backend table: 159 IPC sections, 143 with a BNS successor, 16
 * carried no direct equivalent into the new code.
 */
export const INDEX_STATS = {
  indexed: 159,
  withEquivalent: 143,
  withoutEquivalent: 16,
} as const;

/** The BNS came into force on this date, replacing the IPC. */
export const BNS_COMMENCEMENT = '1 July 2024';

/**
 * Editorial notes for frequently searched sections.
 *
 * Only the fields present here are ever shown. The API returns a section number
 * and a short description; punishment, cognizability and bailability are *not*
 * part of that response, so they are only rendered for sections we have actually
 * reviewed. Anything else leaves those fields absent rather than guessing —
 * inventing "Non-Bailable" for an unreviewed section would be worse than
 * showing nothing.
 */
export interface SectionNote {
  ipcTitle: string;
  punishment?: string;
  cognizable?: boolean;
  bailable?: boolean;
  description?: string;
}

export const SECTION_NOTES: Record<string, SectionNote> = {
  '302': {
    ipcTitle: 'Punishment for murder',
    punishment: 'Death, or imprisonment for life, and fine',
    cognizable: true,
    bailable: false,
    description:
      'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.',
  },
  '304': {
    ipcTitle: 'Culpable homicide not amounting to murder',
    punishment: 'Imprisonment for life, or up to 10 years, and fine',
    cognizable: true,
    bailable: false,
    description:
      'Punishment turns on the degree of intent and knowledge behind the act, which is what separates it from murder.',
  },
  '307': {
    ipcTitle: 'Attempt to murder',
    punishment: 'Up to 10 years and fine; life imprisonment if hurt is caused',
    cognizable: true,
    bailable: false,
  },
  '376': {
    ipcTitle: 'Punishment for rape',
    punishment: 'Rigorous imprisonment of not less than 10 years, extendable to life',
    cognizable: true,
    bailable: false,
  },
  '379': {
    ipcTitle: 'Theft',
    punishment: 'Up to 3 years, or fine, or both',
    cognizable: true,
    bailable: false,
  },
  '420': {
    ipcTitle: 'Cheating and dishonestly inducing delivery of property',
    punishment: 'Up to 7 years and fine',
    cognizable: true,
    bailable: false,
    description:
      'Covers cheating where the deception induces a person to deliver property or alter a valuable security.',
  },
  '498A': {
    ipcTitle: 'Cruelty by husband or his relatives',
    punishment: 'Up to 3 years and fine',
    cognizable: true,
    bailable: false,
    description:
      'Addresses cruelty towards a married woman by her husband or his relatives, including conduct driving her to grave injury or suicide.',
  },
};

/** Sections offered as quick picks — each one is present in the backend index. */
export const QUICK_PICKS = ['302', '307', '376', '379', '420', '498A'] as const;

/**
 * Shown, labelled as an example, before the visitor runs their own lookup.
 *
 * Values mirror the backend table exactly, so the example can never contradict
 * what a real lookup returns. (The previous landing page illustrated IPC 420 as
 * BNS 318(4); this application's own index maps it to 341.)
 */
export const EXAMPLE_MAPPING = {
  ipcSection: '302',
  bnsSection: '103(1)',
  title: 'Punishment for murder',
} as const;

/**
 * Strips the prefixes people actually type: "IPC 420", "Sec. 302", "#498a".
 *
 * The keyword is optional and punctuation is stripped on either side of it, so a
 * bare "#376" normalises as well as "section 376". Longest alternatives come
 * first so SECTION is not partially consumed as SEC.
 */
export function normalizeSectionInput(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^[\s#:.\-]*(?:IPC|BNS|SECTION|SEC|S)?[\s#:.\-]*/i, '')
    .replace(/[\s.]+$/g, '')
    .trim();
}

export type MappingOutcome =
  /** The section has a numbered successor in the BNS. */
  | 'equivalent'
  /** In the index, but the IPC provision has no direct BNS counterpart. */
  | 'no-equivalent'
  /** Not present in the index at all. */
  | 'unindexed';

export interface MappingResult extends LegalSection {
  outcome: MappingOutcome;
  /** True when punishment / cognizability come from a reviewed note. */
  reviewed: boolean;
}

const MISSING_BNS = new Set(['not found', 'n/a', 'na', '']);

/** Turns a `/map` response into something the UI can render without guessing. */
export function toMappingResult(result: ApiMappingResult): MappingResult {
  const ipcSection = result.ipc;
  const note = SECTION_NOTES[ipcSection];
  const raw = (result.bns || '').trim();
  const missing = MISSING_BNS.has(raw.toLowerCase());

  const unindexed = raw.toLowerCase() === 'not found';
  const outcome: MappingOutcome = unindexed
    ? 'unindexed'
    : missing
      ? 'no-equivalent'
      : 'equivalent';

  return {
    id: `${ipcSection}-${raw || 'none'}`,
    ipcSection,
    ipcTitle: note?.ipcTitle || result.description || `IPC section ${ipcSection}`,
    bnsSection: missing ? '' : raw,
    bnsTitle: result.description || note?.ipcTitle || '',
    punishment: note?.punishment,
    cognizable: note?.cognizable,
    bailable: note?.bailable,
    description: note?.description,
    outcome,
    reviewed: Boolean(note),
  };
}

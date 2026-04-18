/**
 * Shared LWC constants, types, and utility functions.
 * Centralises values previously duplicated across CreateComponentModal and UseTemplateModal.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LwcTarget {
  value: string;
  label: string;
}

export interface ApiVersionEntry {
  value: string;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const LWC_TARGETS: LwcTarget[] = [
  { value: 'lightning__AppPage', label: 'Lightning App Page' },
  { value: 'lightning__RecordPage', label: 'Lightning Record Page' },
  { value: 'lightning__HomePage', label: 'Lightning Home Page' },
  { value: 'lightning__FlowScreen', label: 'Lightning Flow Screen' },
  { value: 'lightningCommunity__Page', label: 'Experience Builder Page' },
  { value: 'lightning__UtilityBar', label: 'Utility Bar' },
];

export const API_VERSIONS: ApiVersionEntry[] = [
  { value: '66.0', label: "66.0 (Spring '26)" },
  { value: '65.0', label: "65.0 (Winter '26)" },
  { value: '64.0', label: "64.0 (Summer '25)" },
  { value: '63.0', label: "63.0 (Spring '25)" },
  { value: '62.0', label: "62.0 (Winter '25)" },
  { value: '61.0', label: "61.0 (Summer '24)" },
];

// ─── Validation ───────────────────────────────────────────────────────────────

const LWC_NAME_REGEX = /^[a-z][a-zA-Z0-9]*$/;

/**
 * Validate an LWC component name.
 * Returns an error message string or null if valid.
 */
export function validateName(name: string): string | null {
  if (!name) return null;
  if (!LWC_NAME_REGEX.test(name))
    return 'Must start with a lowercase letter — letters and numbers only, no spaces.';
  if (name.length > 40) return 'Name must be 40 characters or less (Salesforce limit).';
  return null;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Convert a camelCase name to a human-readable label: "myComponent" → "My Component" */
export function camelToLabel(name: string): string {
  if (!name) return '';
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

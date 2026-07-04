import { createContext } from 'react';
import type { NormyClient } from '../client/api.js';
import type { ValidationMode } from '../types.js';

export interface FieldValidationState {
  isValid: boolean;
  score: number;
}

export interface NormyContextValue {
  /** Shared API client instance */
  readonly client: NormyClient;
  /** The Normy project ID all fields will use */
  readonly projectId: string;
  /** Default validation mode for all fields (can be overridden per-field) */
  readonly defaultMode: ValidationMode;
  /** Default debounce in ms for onPause mode */
  readonly pauseMs: number;

  /** Tracked fields on the form and their validation states */
  readonly fields: Record<string, FieldValidationState>;
  /** Register a field's validation state */
  readonly registerField: (id: string, initial: FieldValidationState) => void;
  /** Update a field's validation state */
  readonly updateField: (id: string, update: FieldValidationState) => void;
  /** Unregister a field's validation state */
  readonly unregisterField: (id: string) => void;
}

export const NormyContext = createContext<NormyContextValue | null>(null);
NormyContext.displayName = 'NormyContext';

import { createContext } from 'react';
import type { NormyClient } from '../client/api.js';
import type { ValidationMode } from '../types.js';

export interface NormyContextValue {
  /** Shared API client instance */
  readonly client: NormyClient;
  /** The Normy project ID all fields will use */
  readonly projectId: string;
  /** Default validation mode for all fields (can be overridden per-field) */
  readonly defaultMode: ValidationMode;
  /** Default debounce in ms for onPause mode */
  readonly pauseMs: number;
}

export const NormyContext = createContext<NormyContextValue | null>(null);
NormyContext.displayName = 'NormyContext';

import React, { useMemo } from 'react';
import { NormyContext } from '../context/NormyContext.js';
import { NormyClient } from '../client/api.js';
import type { ValidationMode } from '../types.js';

export interface NormyProviderProps {
  /** Your Normy API key (nrm_live_... or nrm_test_...) */
  apiKey: string;
  /** The Normy project ID */
  projectId: string;
  /**
   * Default validation mode for all fields.
   * Can be overridden per-field via the validationMode prop.
   * @default 'onPause'
   */
  defaultMode?: ValidationMode;
  /**
   * Debounce delay for onPause mode in milliseconds.
   * @default 2000
   */
  pauseMs?: number;
  /** Override the API base URL. Useful for self-hosted instances. */
  apiUrl?: string;
  children: React.ReactNode;
}

export function NormyProvider({
  apiKey,
  projectId,
  defaultMode = 'onPause',
  pauseMs = 2000,
  apiUrl,
  children,
}: NormyProviderProps) {
  const client = useMemo(
    () => new NormyClient({ apiKey, baseUrl: apiUrl }),
    [apiKey, apiUrl]
  );

  const value = useMemo(
    () => ({ client, projectId, defaultMode, pauseMs }),
    [client, projectId, defaultMode, pauseMs]
  );

  return (
    <NormyContext.Provider value={value}>
      {children}
    </NormyContext.Provider>
  );
}

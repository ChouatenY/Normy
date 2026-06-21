import { useContext } from 'react';
import { NormyContext } from '../context/NormyContext.js';
import type { NormyContextValue } from '../context/NormyContext.js';

/**
 * Access the NormyContext. Must be used inside a <NormyProvider>.
 *
 * @throws If called outside of a NormyProvider.
 */
export function useNormy(): NormyContextValue {
  const ctx = useContext(NormyContext);
  if (!ctx) {
    throw new Error(
      '[Normy] useNormy() must be called inside a <NormyProvider>. ' +
      'Wrap your app (or the relevant subtree) with <NormyProvider apiKey="..." projectId="...">.'
    );
  }
  return ctx;
}

import { useNormy } from './useNormy.js';
import { useMemo } from 'react';
import type { FieldValidationState } from '../context/NormyContext.js';

export interface UseFormValidationOptions {
  /** The minimum score (0-100) all registered fields must meet. Defaults to 60. */
  minScore?: number | undefined;
}

export interface UseFormValidationReturn {
  /** True if all registered fields are valid and meet the minimum score criteria */
  isValid: boolean;
  /** The average score of all registered fields */
  score: number;
  /** Map of registered field IDs to their individual validation states */
  fields: Record<string, FieldValidationState>;
}

/**
 * Access form-wide validation state, including average quality score
 * and consolidated validity check.
 */
export function useFormValidation(options?: UseFormValidationOptions): UseFormValidationReturn {
  const { fields } = useNormy();
  const minScore = options?.minScore ?? 60;

  const fieldList = useMemo(() => Object.values(fields), [fields]);

  const isFormValid = useMemo(() => {
    if (fieldList.length === 0) return false;
    return fieldList.every((f) => f.isValid && f.score >= minScore);
  }, [fieldList, minScore]);

  const averageScore = useMemo(() => {
    if (fieldList.length === 0) return 0;
    const sum = fieldList.reduce((acc, f) => acc + f.score, 0);
    return Math.round(sum / fieldList.length);
  }, [fieldList]);

  return {
    isValid: isFormValid,
    score: averageScore,
    fields,
  };
}

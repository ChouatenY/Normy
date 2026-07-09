/**
 * Shared type aliases so components and hooks don't need to import from client/api
 */
export type ValidationMode = 'onBlur' | 'onPause' | 'onSubmit' | 'smart';

export type {
  ValidateRequest,
  ValidateResponse,
  ValidationIssue,
  ValidationSeverity,
  FeedbackCategory,
  NormyApiError,
  NormyApiResult,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantMessage,
} from './client/api.js';

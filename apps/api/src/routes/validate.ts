import { createRoute, z } from '@hono/zod-openapi';

// ─── API Schemas ──────────────────────────────────────────────────────────────

export const ValidateRequestSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid projectId format (UUID required)' }),
  question: z.string().min(1, { message: 'Question cannot be empty' }),
  answer: z.string(),
  fieldContext: z.string().optional(),
  promptVersion: z.string().optional(),
}).openapi('ValidateRequest');

export const ValidateResponseSchema = z.object({
  valid: z.boolean(),
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  issue: z.enum([
    'RANDOM_TEXT',
    'TOO_SHORT',
    'EMPTY',
    'IRRELEVANT_RESPONSE',
    'CONTRADICTORY_RESPONSE',
    'SPAM',
    'LOW_QUALITY',
    'VALID',
    'LOW_CONFIDENCE',
  ]),
  severity: z.enum(['success', 'info', 'warning', 'error']),
  feedback: z.string(),
  feedbackCategory: z.enum([
    'input_quality',
    'input_format',
    'content_quality',
    'content_logic',
    'valid',
    'EXPAND_RESPONSE',
    'ANSWER_THE_QUESTION',
    'ADD_SPECIFIC_DETAILS',
    'REMOVE_RANDOM_TEXT',
    'REMOVE_SPAM',
    'EXPLAIN_REASON',
    'CLARIFY_RESPONSE',
    'NO_ACTION',
  ]).optional(),
  exampleAnswer: z.string().nullable().optional(),
  explanation: z.object({
    problem: z.string().optional(),
    suggestion: z.string().optional(),
    detail: z.string().optional(),
  }).optional(),
  metadata: z.object({
    resolvedBy: z.string().optional(),
    provider: z.string().optional(),
    cached: z.boolean().optional(),
    latencyMs: z.number().optional(),
    pipelineVersion: z.string().optional(),
    promptVersion: z.string().optional(),
  }).optional(),
}).openapi('ValidateResponse');

// ─── Route Definition ─────────────────────────────────────────────────────────

export const validateRoute = createRoute({
  method: 'post',
  path: '/validate',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ValidateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ValidateResponseSchema,
        },
      },
      description: 'Validation execution result',
    },
    400: {
      description: 'Bad request or body payload parsing failure',
    },
    401: {
      description: 'Unauthorized access',
    },
    429: {
      description: 'Rate limit exceeded',
    },
    500: {
      description: 'Internal Server Error',
    },
  },
  security: [
    {
      Bearer: [],
    },
  ],
});

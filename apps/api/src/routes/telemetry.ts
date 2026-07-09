import { createRoute, z } from '@hono/zod-openapi';

export const telemetryBatchRoute = createRoute({
  method: 'post',
  path: '/telemetry/batch',
  security: [{ Bearer: [] }],
  tags: ['Analytics'],
  summary: 'Batch upload SDK telemetry events',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            projectId: z.string().uuid(),
            events: z.array(z.object({
              type: z.enum([
                'validation_triggered', 'validation_completed', 'token_analytics', 'feedback_shown', 'feedback_dismissed', 'feedback_improved', 'feedback_ignored', 'field_focused', 'field_blurred', 'form_submitted', 'form_submit_blocked', 'cache_hit'
              ] as any),
              validationId: z.string().uuid().optional(),
              sessionId: z.string().optional(),
              fieldName: z.string().optional(),
              payload: z.record(z.unknown()).optional(),
              createdAt: z.string().optional(),
            })),
          }),
        },
      },
    },
  },
  responses: {
    202: { description: 'Telemetry accepted' },
    400: { description: 'Bad Request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

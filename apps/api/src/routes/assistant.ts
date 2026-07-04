import { createRoute, z } from '@hono/zod-openapi';
import { db } from '../db/index.js';
import { knowledgeSources } from '../db/schema/knowledge-sources.js';
import { assistantConversations } from '../db/schema/assistant-conversations.js';
import { assistantMessages } from '../db/schema/assistant-messages.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

// ─── API Schemas ──────────────────────────────────────────────────────────────

export const KnowledgeSourceSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['string', 'markdown', 'url']),
  content: z.string(),
  sourceUrl: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('KnowledgeSource');

export const CreateKnowledgeSourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'markdown', 'url']).default('string'),
  content: z.string(),
  sourceUrl: z.string().optional(),
  isActive: z.boolean().default(true),
}).openapi('CreateKnowledgeSource');

export const AssistantChatRequestSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  fieldContext: z.object({
    fieldId: z.string(),
    question: z.string().optional(),
    helpContext: z.string().optional(),
  }).optional(),
  sessionId: z.string().optional(),
  knowledge: z.string().optional(),
}).openapi('AssistantChatRequest');

export const AssistantChatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  response: z.string(),
  createdAt: z.string(),
}).openapi('AssistantChatResponse');

export const AssistantMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  metadata: z.any().nullable().optional(),
  createdAt: z.string(),
}).openapi('AssistantMessage');

// ─── Route Definitions ────────────────────────────────────────────────────────

export const listKnowledgeSourcesRoute = createRoute({
  method: 'get',
  path: '/projects/{projectId}/knowledge-sources',
  request: {
    params: z.object({
      projectId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            sources: z.array(KnowledgeSourceSchema),
          }),
        },
      },
      description: 'List of knowledge sources for the project',
    },
  },
});

export const createKnowledgeSourceRoute = createRoute({
  method: 'post',
  path: '/projects/{projectId}/knowledge-sources',
  request: {
    params: z.object({
      projectId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateKnowledgeSourceSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            source: KnowledgeSourceSchema,
          }),
        },
      },
      description: 'Knowledge source created successfully',
    },
  },
});

export const updateKnowledgeSourceRoute = createRoute({
  method: 'put',
  path: '/projects/{projectId}/knowledge-sources/{id}',
  request: {
    params: z.object({
      projectId: z.string().uuid(),
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateKnowledgeSourceSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            source: KnowledgeSourceSchema,
          }),
        },
      },
      description: 'Knowledge source updated successfully',
    },
  },
});

export const deleteKnowledgeSourceRoute = createRoute({
  method: 'delete',
  path: '/projects/{projectId}/knowledge-sources/{id}',
  request: {
    params: z.object({
      projectId: z.string().uuid(),
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
      description: 'Knowledge source deleted successfully',
    },
  },
});

export const assistantChatRoute = createRoute({
  method: 'post',
  path: '/assistant/chat',
  request: {
    body: {
      content: {
        'application/json': {
          schema: AssistantChatRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AssistantChatResponseSchema,
        },
      },
      description: 'Assistant response payload',
    },
  },
  security: [{ Bearer: [] }],
});

export const getConversationMessagesRoute = createRoute({
  method: 'get',
  path: '/assistant/conversations/{conversationId}/messages',
  request: {
    params: z.object({
      conversationId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            messages: z.array(AssistantMessageSchema),
          }),
        },
      },
      description: 'List of messages in the conversation',
    },
  },
});

export const rateAssistantMessageRoute = createRoute({
  method: 'post',
  path: '/assistant/messages/{messageId}/rate',
  request: {
    params: z.object({
      messageId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            rating: z.enum(['helpful', 'unhelpful']),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
      description: 'Message rated successfully',
    },
  },
});

export const listAssistantConversationsRoute = createRoute({
  method: 'get',
  path: '/projects/{projectId}/assistant/conversations',
  request: {
    params: z.object({
      projectId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            conversations: z.array(z.object({
              id: z.string().uuid(),
              projectId: z.string().uuid(),
              sessionId: z.string().nullable().optional(),
              createdAt: z.string(),
            })),
          }),
        },
      },
      description: 'List of conversations for a project',
    },
  },
});

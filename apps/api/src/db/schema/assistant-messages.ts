import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { assistantConversations } from './assistant-conversations';

export const assistantMessages = pgTable(
  'assistant_messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id').notNull().references(() => assistantConversations.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'), // e.g. { fieldId, question, feedbackRating: 'helpful' | 'unhelpful' }
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index('assistant_messages_conversation_id_idx').on(table.conversationId),
  ]
);

export type AssistantMessage = typeof assistantMessages.$inferSelect;
export type NewAssistantMessage = typeof assistantMessages.$inferInsert;

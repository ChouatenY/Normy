import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects.js';

export const assistantConversations = pgTable(
  'assistant_conversations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    sessionId: text('session_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index('assistant_conversations_project_id_idx').on(table.projectId),
    index('assistant_conversations_session_id_idx').on(table.sessionId),
  ]
);

export type AssistantConversation = typeof assistantConversations.$inferSelect;
export type NewAssistantConversation = typeof assistantConversations.$inferInsert;

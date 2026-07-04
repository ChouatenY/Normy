import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects.js';

export const knowledgeSources = pgTable(
  'knowledge_sources',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['string', 'markdown', 'url'] }).notNull().default('string'),
    content: text('content').notNull(),
    sourceUrl: text('source_url'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index('knowledge_sources_project_id_idx').on(table.projectId),
    index('knowledge_sources_is_active_idx').on(table.isActive),
  ]
);

export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type NewKnowledgeSource = typeof knowledgeSources.$inferInsert;

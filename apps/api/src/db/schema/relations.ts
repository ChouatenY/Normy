/**
 * Drizzle ORM Relations
 *
 * Defines the relational graph for use with Drizzle's `db.query` relational API.
 * These relations do NOT create database constraints — they are TypeScript-only
 * metadata used for type-safe JOIN queries.
 *
 * All foreign key constraints are defined on the table definitions themselves.
 */

import { relations } from 'drizzle-orm';
import { users } from './users.js';
import { projects } from './projects.js';
import { apiKeys } from './api-keys.js';
import { validations } from './validations.js';
import { validationEvents } from './validation-events.js';
import { analyticsDaily } from './analytics-daily.js';
import { providerConfigs } from './provider-configs.js';

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  apiKeys: many(apiKeys),
  validations: many(validations),
  validationEvents: many(validationEvents),
  analyticsDaily: many(analyticsDaily),
  providerConfigs: many(providerConfigs),
}));

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
  validations: many(validations),
}));

// ─── Validations ──────────────────────────────────────────────────────────────

export const validationsRelations = relations(validations, ({ one, many }) => ({
  project: one(projects, {
    fields: [validations.projectId],
    references: [projects.id],
  }),
  apiKey: one(apiKeys, {
    fields: [validations.apiKeyId],
    references: [apiKeys.id],
  }),
  events: many(validationEvents),
}));

// ─── Validation Events ────────────────────────────────────────────────────────

export const validationEventsRelations = relations(
  validationEvents,
  ({ one }) => ({
    validation: one(validations, {
      fields: [validationEvents.validationId],
      references: [validations.id],
    }),
    project: one(projects, {
      fields: [validationEvents.projectId],
      references: [projects.id],
    }),
  }),
);

// ─── Analytics Daily ──────────────────────────────────────────────────────────

export const analyticsDailyRelations = relations(analyticsDaily, ({ one }) => ({
  project: one(projects, {
    fields: [analyticsDaily.projectId],
    references: [projects.id],
  }),
}));

// ─── Provider Configs ─────────────────────────────────────────────────────────

export const providerConfigsRelations = relations(
  providerConfigs,
  ({ one }) => ({
    project: one(projects, {
      fields: [providerConfigs.projectId],
      references: [projects.id],
    }),
  }),
);

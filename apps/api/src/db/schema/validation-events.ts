/**
 * Validation Events table — append-only SDK interaction audit log.
 *
 * Tracks: validation_triggered, feedback_shown, feedback_dismissed,
 *         field_focused, field_blurred, form_submitted, form_submit_blocked.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { validations } from './validations';
import { projects } from './projects';
import { validationEventTypeEnum } from './enums';

export interface ValidationTriggeredPayload {
  mode: 'onBlur' | 'onPause' | 'onSubmit';
  dwellTimeMs?: number;
}

export interface FeedbackShownPayload {
  severity: 'success' | 'info' | 'warning' | 'error';
  autoDismiss: boolean;
  visibleMs?: number;
}

export interface FeedbackDismissedPayload {
  dismissedBy: 'user' | 'timeout' | 'revalidated';
}

export interface FormSubmittedPayload {
  allowed: boolean;
  blockedFields?: string[];
}

export type ValidationEventPayload =
  | ValidationTriggeredPayload
  | FeedbackShownPayload
  | FeedbackDismissedPayload
  | FormSubmittedPayload
  | Record<string, unknown>;

export const validationEvents = pgTable(
  'validation_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Nullable — some events fire before a validation exists (e.g. field_focused)
    validationId: uuid('validation_id').references(() => validations.id, {
      onDelete: 'cascade',
    }),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    type: validationEventTypeEnum('type').notNull(),

    /** SDK-generated session correlation handle (not a user identifier) */
    sessionId: text('session_id'),

    fieldName: text('field_name'),

    payload: jsonb('payload').$type<ValidationEventPayload>(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index('val_events_validation_id_idx').on(table.validationId),
    index('val_events_project_created_idx').on(table.projectId, table.createdAt),
    index('val_events_session_id_idx').on(table.sessionId),
    index('val_events_type_idx').on(table.type),
    index('val_events_created_at_idx').on(table.createdAt),
  ],
);

export type ValidationEvent = typeof validationEvents.$inferSelect;
export type NewValidationEvent = typeof validationEvents.$inferInsert;

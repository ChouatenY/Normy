import type { ValidationSeverity } from '../types.js';

export type NotificationTreatment = 'toast' | 'inline_hint' | 'checkmark' | 'none';
export type NotificationPolicyName = 'aggressive' | 'balanced' | 'minimal' | 'silent' | 'custom';

export interface NotificationRuleContext {
  severity: ValidationSeverity;
  score: number;
  issue: string;
}

export interface NotificationStrategy {
  getTreatment(context: NotificationRuleContext): NotificationTreatment;
}

export class AggressivePolicy implements NotificationStrategy {
  getTreatment(): NotificationTreatment {
    return 'toast';
  }
}

export class BalancedPolicy implements NotificationStrategy {
  getTreatment({ severity }: NotificationRuleContext): NotificationTreatment {
    switch (severity) {
      case 'error': return 'toast';
      case 'warning': return 'toast';
      case 'info': return 'inline_hint';
      case 'success': return 'checkmark';
      default: return 'toast';
    }
  }
}

export class MinimalPolicy implements NotificationStrategy {
  getTreatment({ severity }: NotificationRuleContext): NotificationTreatment {
    switch (severity) {
      case 'error': return 'toast';
      case 'warning': return 'inline_hint';
      case 'success': return 'none';
      case 'info': return 'none';
      default: return 'none';
    }
  }
}

export class SilentPolicy implements NotificationStrategy {
  getTreatment(): NotificationTreatment {
    return 'none';
  }
}

export class CustomPolicy implements NotificationStrategy {
  private overrides: Partial<Record<ValidationSeverity, NotificationTreatment>>;
  private basePolicy: NotificationStrategy;

  constructor(
    overrides: Partial<Record<ValidationSeverity, NotificationTreatment>>, 
    basePolicy: NotificationStrategy = new BalancedPolicy()
  ) {
    this.overrides = overrides;
    this.basePolicy = basePolicy;
  }

  getTreatment(context: NotificationRuleContext): NotificationTreatment {
    if (this.overrides[context.severity]) {
      return this.overrides[context.severity]!;
    }
    return this.basePolicy.getTreatment(context);
  }
}

export function createNotificationPolicy(
  name: NotificationPolicyName,
  customRules?: Partial<Record<ValidationSeverity, NotificationTreatment>>
): NotificationStrategy {
  if (name === 'custom' && customRules) {
    return new CustomPolicy(customRules);
  }
  switch (name) {
    case 'aggressive': return new AggressivePolicy();
    case 'minimal': return new MinimalPolicy();
    case 'silent': return new SilentPolicy();
    case 'balanced':
    default:
      return new BalancedPolicy();
  }
}

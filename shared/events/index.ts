import { User, PlayerProfile, Team } from '../types';

export interface DomainEvent<T = any> {
  id: string;          // UUID for trace
  type: string;        // dot-notation, e.g. "user.registered"
  tenantId: string;
  timestamp: string;   // ISO8601
  version: number;     // schema version
  payload: T;
}

// Concrete Event Definitions
export interface UserRegisteredPayload {
  user: Pick<User, 'id' | 'email' | 'role' | 'tenantId'>;
}

export interface PlayerEvaluatedPayload {
  playerId: string;
  coachId: string;
  eventId: string;
  scores: Record<string, number>;
  overall: number;
}

export interface PaymentCompletedPayload {
  subscriptionId: string;
  tenantId: string;
  amount: number;
  plan: string;
}

export interface EventCreatedPayload {
  eventId: string;
  title: string;
  teamId: string;
  startsAt: string;
}

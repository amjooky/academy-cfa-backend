import { executeTenantQuery } from '../config/db';

export async function parentOwnsPlayer(
  tenantId: string,
  parentUserId: string,
  playerId: string
): Promise<boolean> {
  const rows = await executeTenantQuery(
    tenantId,
    `SELECT 1 AS ok FROM parent_children WHERE parent_user_id = ? AND player_id = ? LIMIT 1`,
    [parentUserId, playerId]
  );
  return rows.length > 0;
}

export async function playerOwnsSelf(
  tenantId: string,
  userId: string,
  playerId: string
): Promise<boolean> {
  const rows = await executeTenantQuery(
    tenantId,
    `SELECT id FROM players WHERE user_id = ? AND id = ? LIMIT 1`,
    [userId, playerId]
  );
  return rows.length > 0;
}

const STAFF_ROLES = ['ACADEMY_ADMIN', 'COACH'];

export async function canAccessPlayer(
  tenantId: string,
  userId: string,
  role: string,
  playerId: string
): Promise<boolean> {
  if (STAFF_ROLES.includes(role)) return true;
  if (role === 'PARENT') return parentOwnsPlayer(tenantId, userId, playerId);
  if (role === 'PLAYER') return playerOwnsSelf(tenantId, userId, playerId);
  return false;
}

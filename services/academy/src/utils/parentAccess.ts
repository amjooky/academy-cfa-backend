import { executeTenantQuery } from '../config/db';

export async function getParentPlayerIds(tenantId: string, parentUserId: string): Promise<string[]> {
  const rows = await executeTenantQuery(
    tenantId,
    `SELECT player_id FROM parent_children WHERE parent_user_id = ?`,
    [parentUserId]
  );
  return rows.map((r: { player_id: string }) => r.player_id);
}

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

export async function getPlayerIdsForUser(
  tenantId: string,
  userId: string,
  role: string
): Promise<string[]> {
  if (role === 'PARENT') return getParentPlayerIds(tenantId, userId);
  if (role === 'PLAYER') {
    const rows = await executeTenantQuery(
      tenantId,
      `SELECT id FROM players WHERE user_id = ?`,
      [userId]
    );
    return rows.map((r: { id: string }) => r.id);
  }
  return [];
}

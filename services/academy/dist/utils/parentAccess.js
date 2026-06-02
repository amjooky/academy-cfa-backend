"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentPlayerIds = getParentPlayerIds;
exports.parentOwnsPlayer = parentOwnsPlayer;
exports.getPlayerIdsForUser = getPlayerIdsForUser;
const db_1 = require("../config/db");
async function getParentPlayerIds(tenantId, parentUserId) {
    const rows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT player_id FROM parent_children WHERE parent_user_id = ?`, [parentUserId]);
    return rows.map((r) => r.player_id);
}
async function parentOwnsPlayer(tenantId, parentUserId, playerId) {
    const rows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT 1 AS ok FROM parent_children WHERE parent_user_id = ? AND player_id = ? LIMIT 1`, [parentUserId, playerId]);
    return rows.length > 0;
}
async function getPlayerIdsForUser(tenantId, userId, role) {
    if (role === 'PARENT')
        return getParentPlayerIds(tenantId, userId);
    if (role === 'PLAYER') {
        const rows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id FROM players WHERE user_id = ?`, [userId]);
        return rows.map((r) => r.id);
    }
    return [];
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parentOwnsPlayer = parentOwnsPlayer;
exports.playerOwnsSelf = playerOwnsSelf;
exports.canAccessPlayer = canAccessPlayer;
const db_1 = require("../config/db");
async function parentOwnsPlayer(tenantId, parentUserId, playerId) {
    const rows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT 1 AS ok FROM parent_children WHERE parent_user_id = ? AND player_id = ? LIMIT 1`, [parentUserId, playerId]);
    return rows.length > 0;
}
async function playerOwnsSelf(tenantId, userId, playerId) {
    const rows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id FROM players WHERE user_id = ? AND id = ? LIMIT 1`, [userId, playerId]);
    return rows.length > 0;
}
const STAFF_ROLES = ['ACADEMY_ADMIN', 'COACH'];
async function canAccessPlayer(tenantId, userId, role, playerId) {
    if (STAFF_ROLES.includes(role))
        return true;
    if (role === 'PARENT')
        return parentOwnsPlayer(tenantId, userId, playerId);
    if (role === 'PLAYER')
        return playerOwnsSelf(tenantId, userId, playerId);
    return false;
}

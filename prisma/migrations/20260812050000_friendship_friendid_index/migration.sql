-- getFriendsData filters on friendId alone for two of its four queries
-- (incoming accepted/pending friendship rows) — the existing unique index
-- on (userId, friendId) can't serve a friendId-only lookup, forcing a full
-- table scan (docs/41-audit-backend-data.md).
CREATE INDEX "Friendship_friendId_status_idx" ON "Friendship"("friendId", "status");

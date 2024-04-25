-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CastLog" (
    "hash" TEXT NOT NULL PRIMARY KEY,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "CastLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ModeratedChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CastLog" ("channelId", "createdAt", "hash", "status", "updatedAt") SELECT "channelId", "createdAt", "hash", "status", "updatedAt" FROM "CastLog";
DROP TABLE "CastLog";
ALTER TABLE "new_CastLog" RENAME TO "CastLog";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
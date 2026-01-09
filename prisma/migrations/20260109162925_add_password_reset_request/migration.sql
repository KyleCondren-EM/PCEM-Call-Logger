-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "profileImage" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "mustResetPassword" BOOLEAN NOT NULL DEFAULT false,
    "tempPassword" TEXT,
    "passwordResetRequested" BOOLEAN NOT NULL DEFAULT false,
    "passwordResetRequestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("approved", "approvedAt", "approvedBy", "createdAt", "department", "email", "id", "jobTitle", "mustResetPassword", "name", "password", "phone", "profileImage", "role", "tempPassword", "updatedAt", "username") SELECT "approved", "approvedAt", "approvedBy", "createdAt", "department", "email", "id", "jobTitle", "mustResetPassword", "name", "password", "phone", "profileImage", "role", "tempPassword", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

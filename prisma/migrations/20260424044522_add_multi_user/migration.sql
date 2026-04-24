/*
  Warnings:

  - Added the required column `fullName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "bankId" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "paidMethod" TEXT,
    "paidBankId" TEXT,
    "createdById" TEXT,
    CONSTRAINT "Invoice_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_paidBankId_fkey" FOREIGN KEY ("paidBankId") REFERENCES "Bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("bankId", "createdAt", "date", "deletedAt", "id", "invoiceNumber", "paidAt", "paidBankId", "paidMethod", "paymentMethod", "totalAmount", "updatedAt") SELECT "bankId", "createdAt", "date", "deletedAt", "id", "invoiceNumber", "paidAt", "paidBankId", "paidMethod", "paymentMethod", "totalAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "id", "password", "username", "fullName", "updatedAt") SELECT "createdAt", "id", "password", "username", 'Administrator', CURRENT_TIMESTAMP FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

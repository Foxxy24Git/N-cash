/*
  Warnings:

  - Made the column `createdById` on table `Invoice` required. This step will fail if there are existing NULL values in that column.

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
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Invoice_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_paidBankId_fkey" FOREIGN KEY ("paidBankId") REFERENCES "Bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("bankId", "createdAt", "createdById", "date", "deletedAt", "id", "invoiceNumber", "paidAt", "paidBankId", "paidMethod", "paymentMethod", "totalAmount", "updatedAt") SELECT "bankId", "createdAt", "createdById", "date", "deletedAt", "id", "invoiceNumber", "paidAt", "paidBankId", "paidMethod", "paymentMethod", "totalAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

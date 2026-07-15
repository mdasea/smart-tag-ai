-- CreateTable
CREATE TABLE "PendingTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "imageUrl" TEXT,
    "suggestedTags" TEXT NOT NULL,
    "tagQualityScore" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingTag_productId_key" ON "PendingTag"("productId");

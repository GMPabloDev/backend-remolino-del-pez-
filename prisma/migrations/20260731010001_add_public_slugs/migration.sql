-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "slug" VARCHAR(80) NOT NULL;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "slug" VARCHAR(80) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Branch_restaurantId_slug_key" ON "Branch"("restaurantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

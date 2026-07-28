-- CreateEnum
CREATE TYPE "MenuCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DishStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BranchDishStatus" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'INACTIVE');

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "MenuCategoryStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalizedName" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "imageUrl" VARCHAR(2048),
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL,
    "status" "DishStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchDish" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "dishId" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "BranchDishStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchDish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuCategory_restaurantId_status_position_idx" ON "MenuCategory"("restaurantId", "status", "position");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_restaurantId_normalizedName_key" ON "MenuCategory"("restaurantId", "normalizedName");

-- CreateIndex
CREATE INDEX "Dish_restaurantId_status_idx" ON "Dish"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Dish_categoryId_position_idx" ON "Dish"("categoryId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Dish_restaurantId_normalizedName_key" ON "Dish"("restaurantId", "normalizedName");

-- CreateIndex
CREATE INDEX "BranchDish_branchId_status_idx" ON "BranchDish"("branchId", "status");

-- CreateIndex
CREATE INDEX "BranchDish_dishId_idx" ON "BranchDish"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchDish_branchId_dishId_key" ON "BranchDish"("branchId", "dishId");

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchDish" ADD CONSTRAINT "BranchDish_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchDish" ADD CONSTRAINT "BranchDish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

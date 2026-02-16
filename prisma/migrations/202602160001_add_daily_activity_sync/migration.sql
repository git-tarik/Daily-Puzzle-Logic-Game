-- CreateTable
CREATE TABLE "daily_activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_activity_date_idx" ON "daily_activity"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_activity_userId_date_key" ON "daily_activity"("userId", "date");

-- AddForeignKey
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


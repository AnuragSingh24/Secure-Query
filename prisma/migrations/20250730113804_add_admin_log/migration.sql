-- CreateTable
CREATE TABLE `AdminLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `userRole` ENUM('ADMIN', 'EMPLOYEE', 'ANALYST') NOT NULL,
    `prompt` VARCHAR(191) NOT NULL,
    `step0Result` VARCHAR(191) NOT NULL,
    `step1SQL` VARCHAR(191) NULL,
    `step2Decision` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

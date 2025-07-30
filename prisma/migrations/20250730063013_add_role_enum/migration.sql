-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'EMPLOYEE', 'ANALYST') NOT NULL DEFAULT 'EMPLOYEE',
    `isVerified` BOOLEAN NULL DEFAULT false,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `otp` TEXT NULL,
    `otpExpiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminData` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeName` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `skillSet` VARCHAR(191) NOT NULL,
    `manager` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `projectName` VARCHAR(191) NOT NULL,
    `projectStartDate` VARCHAR(191) NOT NULL,
    `projectEndDate` VARCHAR(191) NOT NULL,
    `billabilityStatus` VARCHAR(191) NOT NULL,
    `benchReason` VARCHAR(191) NULL,
    `benchStartDate` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeType` VARCHAR(191) NOT NULL,
    `end_year` INTEGER NOT NULL,
    `experienceYears` DOUBLE NOT NULL,
    `lastAppraisalRating` DOUBLE NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `reallocationTimeDays` INTEGER NOT NULL,
    `start_year` INTEGER NOT NULL,

    UNIQUE INDEX `AdminData_employeeId_key`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

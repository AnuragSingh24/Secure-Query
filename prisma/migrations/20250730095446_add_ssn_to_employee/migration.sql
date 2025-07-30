/*
  Warnings:

  - A unique constraint covering the columns `[ssn]` on the table `EmployeeDetails` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ssn` to the `EmployeeDetails` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `EmployeeDetails` ADD COLUMN `ssn` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `EmployeeDetails_ssn_key` ON `EmployeeDetails`(`ssn`);

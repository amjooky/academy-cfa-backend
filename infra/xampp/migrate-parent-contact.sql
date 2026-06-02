-- Run on existing tenant_demo if users table lacks parent contact columns
USE `tenant_demo`;

-- Ignore errors if columns already exist
ALTER TABLE `users` ADD COLUMN `full_name` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(255) NULL;

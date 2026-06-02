-- ============================================================
-- Chermiti Football Academy (CFA) — Clean Database Schema
-- Single-tenant setup with one admin account.
-- Import: npm run db:reset  OR  setup-xampp-db.bat
-- ============================================================

-- ── Shared database (SaaS subscription tracking) ──
CREATE DATABASE IF NOT EXISTS `shared` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `shared`;

DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
  `id` VARCHAR(255) PRIMARY KEY,
  `tenant_id` VARCHAR(255) UNIQUE NOT NULL,
  `plan` VARCHAR(50) NOT NULL DEFAULT 'STARTER',
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `current_period_end` DATETIME NOT NULL,
  `konnect_sub_id` VARCHAR(255) NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO `subscriptions` (`id`, `tenant_id`, `plan`, `status`, `current_period_end`)
VALUES ('sub-demo', 'demo', 'PRO', 'active', DATE_ADD(NOW(), INTERVAL 1 YEAR));

-- ── Tenant database (CFA academy data) ──
CREATE DATABASE IF NOT EXISTS `tenant_demo` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tenant_demo`;

DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `evaluations`;
DROP TABLE IF EXISTS `player_badges`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `player_subscriptions`;
DROP TABLE IF EXISTS `parent_children`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `team_players`;
DROP TABLE IF EXISTS `players`;
DROP TABLE IF EXISTS `teams`;
DROP TABLE IF EXISTS `academy_profile`;
DROP TABLE IF EXISTS `users`;

-- ── Users ──
CREATE TABLE `users` (
  `id` VARCHAR(255) PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `tenant_id` VARCHAR(255) NOT NULL,
  `kyc_status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `full_name` VARCHAR(255) NULL,
  `phone` VARCHAR(255) NULL
);

-- Single admin account: the admin enrolls players, parents, and coaches from the UI.
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `tenant_id`, `kyc_status`, `full_name`, `phone`) VALUES
('cfa-admin-001', 'admin@cfa.tn', 'admin', 'ACADEMY_ADMIN', 'demo', 'completed', 'Yassine Chermiti', '+216 50 000 001');

-- ── Academy Profile (branding) ──
CREATE TABLE `academy_profile` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `logo_url` VARCHAR(255) NULL,
  `primary_color` VARCHAR(50) NULL,
  `secondary_color` VARCHAR(50) NULL,
  `language` VARCHAR(50) DEFAULT 'fr'
);

INSERT INTO `academy_profile` (`id`, `name`, `logo_url`, `primary_color`, `secondary_color`, `language`) VALUES
('prof-1', 'Chermiti Football Academy', '/logo-cfa.png', '#dc2626', '#1e293b', 'fr');

-- ── Teams ──
CREATE TABLE `teams` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `age_group` VARCHAR(50) NULL,
  `coach_id` VARCHAR(255) NULL,
  `season` VARCHAR(100) NULL
);

INSERT INTO `teams` (`id`, `name`, `age_group`, `season`) VALUES
('team-u17', 'U17 Elite', 'U17', '2025-2026'),
('team-u15', 'U15 Pro', 'U15', '2025-2026'),
('team-u13', 'U13 Rookie', 'U13', '2025-2026');

-- ── Players (empty — admin enrolls via UI) ──
CREATE TABLE `players` (
  `id` VARCHAR(255) PRIMARY KEY,
  `user_id` VARCHAR(255) NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `dob` DATE NULL,
  `position` VARCHAR(100) NULL,
  `xp_total` INT DEFAULT 0,
  `rank` VARCHAR(50) DEFAULT 'rookie',
  `status` VARCHAR(50) DEFAULT 'active',
  `photo_url` VARCHAR(255) NULL,
  `team` VARCHAR(255) NULL
);

-- ── Team-Player mapping ──
CREATE TABLE `team_players` (
  `team_id` VARCHAR(255) NOT NULL,
  `player_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`team_id`, `player_id`)
);

-- ── Parent-Child mapping ──
CREATE TABLE `parent_children` (
  `parent_user_id` VARCHAR(255) NOT NULL,
  `player_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`parent_user_id`, `player_id`)
);

-- ── Player Subscriptions (billing) ──
CREATE TABLE `player_subscriptions` (
  `id` VARCHAR(255) PRIMARY KEY,
  `player_id` VARCHAR(255) NOT NULL,
  `parent_user_id` VARCHAR(255) NULL,
  `plan` VARCHAR(50) NOT NULL DEFAULT 'monthly',
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'TND',
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `next_due` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Events (calendar) ──
CREATE TABLE `events` (
  `id` VARCHAR(255) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `team_id` VARCHAR(255) NULL,
  `location` VARCHAR(255) NULL,
  `starts_at` DATETIME NOT NULL,
  `ends_at` DATETIME NOT NULL
);

-- ── Attendance ──
CREATE TABLE `attendance` (
  `event_id` VARCHAR(255) NOT NULL,
  `player_id` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `marked_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`, `player_id`)
);

-- ── Invoices ──
CREATE TABLE `invoices` (
  `id` VARCHAR(255) PRIMARY KEY,
  `player_id` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'TND',
  `plan` VARCHAR(50) NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `issued_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `paid_manually` BOOLEAN DEFAULT FALSE,
  `paid_at` DATETIME NULL,
  `marked_by` VARCHAR(255) NULL,
  `admin_note` TEXT NULL
);

-- ── Evaluations ──
CREATE TABLE `evaluations` (
  `id` VARCHAR(255) PRIMARY KEY,
  `player_id` VARCHAR(255) NOT NULL,
  `coach_id` VARCHAR(255) NOT NULL,
  `event_id` VARCHAR(255) NULL,
  `scores` TEXT NOT NULL,
  `overall` INT NOT NULL,
  `notes` TEXT NULL,
  `evaluated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Player Badges ──
CREATE TABLE `player_badges` (
  `player_id` VARCHAR(255) NOT NULL,
  `badge_name` VARCHAR(255) NOT NULL,
  `unlocked_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`player_id`, `badge_name`)
);

USE `tenant_demo`;

CREATE TABLE IF NOT EXISTS `parent_children` (
  `parent_user_id` VARCHAR(255) NOT NULL,
  `player_id` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`parent_user_id`, `player_id`)
);

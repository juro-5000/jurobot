-- JuroBot MariaDB/MySQL Setup Script
-- Create a database named 'jurobot' and use it

CREATE DATABASE IF NOT EXISTS jurobot;
USE jurobot;

-- Players tracking
CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(16) UNIQUE NOT NULL,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  playtime INT DEFAULT 0,
  deaths INT DEFAULT 0,
  chat_messages INT DEFAULT 0,
  first_chat TEXT,
  role ENUM('owner', 'admin', 'trusted', 'player') DEFAULT 'player',
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Item logs (what items have been dropped/collected)
CREATE TABLE IF NOT EXISTS item_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item_name (item_name),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- All item logs (persistent log of every item seen)
CREATE TABLE IF NOT EXISTS all_item_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item_all_name (item_name),
  INDEX idx_timestamp_all (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Global server stats
CREATE TABLE IF NOT EXISTS server_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stat_name VARCHAR(50) UNIQUE NOT NULL,
  stat_value BIGINT DEFAULT 0,
  INDEX idx_stat_name (stat_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Items to keep (not to be dropped by the bot)
CREATE TABLE IF NOT EXISTS keeplist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(100) UNIQUE NOT NULL,
  added_by VARCHAR(16),
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item_name (item_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Banned players from using bot commands
CREATE TABLE IF NOT EXISTS banned_players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(16) UNIQUE NOT NULL,
  banned_by VARCHAR(16),
  banned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activity log (player count and bot ping)
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  player_count INT,
  bot_ping INT,
  player_names TEXT,
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chat logs
CREATE TABLE IF NOT EXISTS chat_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(16) NOT NULL,
  message TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initialize stats
INSERT IGNORE INTO server_stats (stat_name, stat_value) VALUES ('total_players', 0);
INSERT IGNORE INTO server_stats (stat_name, stat_value) VALUES ('total_chat_messages', 0);
INSERT IGNORE INTO server_stats (stat_name, stat_value) VALUES ('total_deaths', 0);

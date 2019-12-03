/*
Navicat MySQL Data Transfer

Source Server         : local
Source Server Version : 50505
Source Host           : 127.0.0.1:3306
Source Database       : ntalk

Target Server Type    : MYSQL
Target Server Version : 50505
File Encoding         : 65001

Date: 2019-12-03 15:09:41
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for `talk`
-- ----------------------------
DROP TABLE IF EXISTS `talk`;
CREATE TABLE `talk` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `type` enum('single','group') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'single' COMMENT 'single. 單人對話, group. 群組對話',
  `name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `avatar` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `lifetime` int(11) NOT NULL DEFAULT 0 COMMENT '訊息存活時間',
  `creator_id` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of talk
-- ----------------------------

-- ----------------------------
-- Table structure for `talk_join`
-- ----------------------------
DROP TABLE IF EXISTS `talk_join`;
CREATE TABLE `talk_join` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `talk_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `unread` int(11) NOT NULL DEFAULT 0 COMMENT '未讀筆數',
  `last_read_id` bigint(11) NOT NULL DEFAULT 0 COMMENT '最後一筆已讀 message.id',
  `created_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of talk_join
-- ----------------------------

-- ----------------------------
-- Table structure for `talk_message`
-- ----------------------------
DROP TABLE IF EXISTS `talk_message`;
CREATE TABLE `talk_message` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL COMMENT '發話者',
  `talk_id` bigint(20) NOT NULL COMMENT '群組 or 對象使用者 id ',
  `content` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of talk_message
-- ----------------------------

-- ----------------------------
-- Table structure for `user`
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `token` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sessid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `avatar` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Records of user
-- ----------------------------

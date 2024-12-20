/*
 Navicat MySQL Data Transfer

 Source Server         : [CRUD] SheltonVPS
 Source Server Type    : MariaDB
 Source Server Version : 101106 (10.11.6-MariaDB-0+deb12u1)
 Source Host           : 51.89.92.138:3306
 Source Schema         : crud

 Target Server Type    : MariaDB
 Target Server Version : 101106 (10.11.6-MariaDB-0+deb12u1)
 File Encoding         : 65001

 Date: 13/10/2024 18:40:13
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `userId` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `role` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`userId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;

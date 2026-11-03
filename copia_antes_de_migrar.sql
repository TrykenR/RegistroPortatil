-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: autogestion_portatiles
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `administradores`
--

DROP TABLE IF EXISTS `administradores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `administradores` (
  `id_administrador` smallint unsigned NOT NULL AUTO_INCREMENT,
  `usuario` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clave_hash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_administrador`),
  UNIQUE KEY `uk_administrador_usuario` (`usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `administradores`
--

LOCK TABLES `administradores` WRITE;
/*!40000 ALTER TABLE `administradores` DISABLE KEYS */;
INSERT INTO `administradores` VALUES (1,'admin','$2a$10$jmbbxYSV0h2I0.5R7ZKCQewUstt5KIFxmMG/I/nq53mSrgcgFegtu',1,'2026-09-20 12:11:12');
/*!40000 ALTER TABLE `administradores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `colores`
--

DROP TABLE IF EXISTS `colores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `colores` (
  `id_color` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_hex` char(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_color`),
  UNIQUE KEY `uk_color_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `colores`
--

LOCK TABLES `colores` WRITE;
/*!40000 ALTER TABLE `colores` DISABLE KEYS */;
INSERT INTO `colores` VALUES (1,'NEGRO','#1A1A1A'),(2,'GRIS','#8A8D91'),(3,'PLATEADO','#C8CCD0'),(4,'BLANCO','#F2F2F2'),(5,'AZUL','#1F4E9C'),(6,'ROJO','#B3261E'),(7,'DORADO','#C8A24B');
/*!40000 ALTER TABLE `colores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispositivos_estudiante`
--

DROP TABLE IF EXISTS `dispositivos_estudiante`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispositivos_estudiante` (
  `id_dispositivo` int unsigned NOT NULL AUTO_INCREMENT,
  `id_estudiante` int unsigned NOT NULL,
  `id_marca` smallint unsigned NOT NULL,
  `id_color` smallint unsigned NOT NULL,
  `alias` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_dispositivo`),
  KEY `idx_dispositivo_estudiante` (`id_estudiante`),
  KEY `fk_dispositivo_marca` (`id_marca`),
  KEY `fk_dispositivo_color` (`id_color`),
  CONSTRAINT `fk_dispositivo_color` FOREIGN KEY (`id_color`) REFERENCES `colores` (`id_color`),
  CONSTRAINT `fk_dispositivo_estudiante` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id_estudiante`) ON DELETE CASCADE,
  CONSTRAINT `fk_dispositivo_marca` FOREIGN KEY (`id_marca`) REFERENCES `marcas` (`id_marca`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispositivos_estudiante`
--

LOCK TABLES `dispositivos_estudiante` WRITE;
/*!40000 ALTER TABLE `dispositivos_estudiante` DISABLE KEYS */;
INSERT INTO `dispositivos_estudiante` VALUES (1,1,2,1,'El de la U',1,'2026-09-19 12:09:11'),(2,1,1,2,'El de la casa',1,'2026-09-19 12:09:11'),(3,2,4,5,'',1,'2026-09-19 12:37:17'),(4,3,8,7,'',1,'2026-09-19 19:08:13'),(5,4,4,5,NULL,1,'2026-09-19 19:28:38'),(6,4,5,5,NULL,1,'2026-09-19 19:29:21'),(7,5,1,1,'El gratis',1,'2026-09-19 20:01:46'),(8,6,6,3,'',1,'2026-10-09 10:04:54');
/*!40000 ALTER TABLE `dispositivos_estudiante` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estudiantes`
--

DROP TABLE IF EXISTS `estudiantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estudiantes` (
  `id_estudiante` int unsigned NOT NULL AUTO_INCREMENT,
  `numero_documento` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_estudiantil` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombres` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_estudiante`),
  UNIQUE KEY `uk_estudiante_documento` (`numero_documento`),
  UNIQUE KEY `uk_estudiante_codigo` (`codigo_estudiantil`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estudiantes`
--

LOCK TABLES `estudiantes` WRITE;
/*!40000 ALTER TABLE `estudiantes` DISABLE KEYS */;
INSERT INTO `estudiantes` VALUES (1,'1007654321','2019115034','Andr├®s Camilo','G├│mez Daza',1,'2026-09-19 12:09:11'),(2,'0182320041',NULL,'A','E',1,'2026-09-19 12:37:14'),(3,'0182320042',NULL,'T','A',1,'2026-09-19 19:08:04'),(4,'0182320055',NULL,'a','a',1,'2026-09-19 19:26:35'),(5,'182410085',NULL,'Mateo','Maestre',1,'2026-09-19 20:01:09'),(6,'1121530752',NULL,'yorly enrique','castillo rojas',1,'2026-10-09 10:02:11');
/*!40000 ALTER TABLE `estudiantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_accesos`
--

DROP TABLE IF EXISTS `historial_accesos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_accesos` (
  `id_registro` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_dispositivo` int unsigned NOT NULL,
  `id_tipo_movimiento` tinyint unsigned NOT NULL,
  `id_origen` smallint unsigned NOT NULL,
  `fecha_hora_evento` datetime NOT NULL,
  `fecha_hora_sincronizado` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_registro`),
  KEY `idx_historial_evento` (`fecha_hora_evento`),
  KEY `idx_historial_dispositivo` (`id_dispositivo`,`fecha_hora_evento`),
  KEY `fk_historial_movimiento` (`id_tipo_movimiento`),
  KEY `fk_historial_origen` (`id_origen`),
  CONSTRAINT `fk_historial_dispositivo` FOREIGN KEY (`id_dispositivo`) REFERENCES `dispositivos_estudiante` (`id_dispositivo`),
  CONSTRAINT `fk_historial_movimiento` FOREIGN KEY (`id_tipo_movimiento`) REFERENCES `tipos_movimiento` (`id_tipo_movimiento`),
  CONSTRAINT `fk_historial_origen` FOREIGN KEY (`id_origen`) REFERENCES `origenes_registro` (`id_origen`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_accesos`
--

LOCK TABLES `historial_accesos` WRITE;
/*!40000 ALTER TABLE `historial_accesos` DISABLE KEYS */;
INSERT INTO `historial_accesos` VALUES (1,1,1,1,'2026-09-18 12:09:11','2026-09-18 12:09:11'),(2,2,1,2,'2026-09-19 11:09:11','2026-09-19 11:15:11'),(3,3,1,1,'2026-09-19 12:37:17','2026-09-19 12:37:17'),(4,3,2,1,'2026-09-19 12:49:25','2026-09-19 12:49:24'),(5,3,1,2,'2026-09-19 12:51:18','2026-09-19 12:52:46'),(6,4,1,1,'2026-09-19 19:08:14','2026-09-19 19:08:13'),(7,5,1,1,'2026-09-19 19:28:39','2026-09-19 19:28:39'),(8,6,1,1,'2026-09-19 19:29:22','2026-09-19 19:29:21'),(9,7,1,1,'2026-09-19 20:01:47','2026-09-19 20:01:47'),(10,3,1,2,'2026-09-20 10:06:17','2026-09-20 12:02:09'),(11,3,1,1,'2026-10-09 10:02:31','2026-10-09 10:02:30'),(12,8,1,1,'2026-10-09 10:04:55','2026-10-09 10:04:55'),(13,3,1,1,'2026-10-10 12:11:17','2026-10-10 12:11:17');
/*!40000 ALTER TABLE `historial_accesos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marcas`
--

DROP TABLE IF EXISTS `marcas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marcas` (
  `id_marca` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_marca`),
  UNIQUE KEY `uk_marca_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marcas`
--

LOCK TABLES `marcas` WRITE;
/*!40000 ALTER TABLE `marcas` DISABLE KEYS */;
INSERT INTO `marcas` VALUES (4,'ACER'),(3,'ASUS'),(5,'DELL'),(1,'HP'),(2,'LENOVO'),(6,'MAC'),(8,'OTRA'),(7,'SAMSUNG');
/*!40000 ALTER TABLE `marcas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `origenes_registro`
--

DROP TABLE IF EXISTS `origenes_registro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `origenes_registro` (
  `id_origen` smallint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_origen`),
  UNIQUE KEY `uk_origen_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `origenes_registro`
--

LOCK TABLES `origenes_registro` WRITE;
/*!40000 ALTER TABLE `origenes_registro` DISABLE KEYS */;
INSERT INTO `origenes_registro` VALUES (2,'OFFLINE_SINCRONIZADO'),(1,'ONLINE');
/*!40000 ALTER TABLE `origenes_registro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipos_movimiento`
--

DROP TABLE IF EXISTS `tipos_movimiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_movimiento` (
  `id_tipo_movimiento` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_tipo_movimiento`),
  UNIQUE KEY `uk_tipo_movimiento_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_movimiento`
--

LOCK TABLES `tipos_movimiento` WRITE;
/*!40000 ALTER TABLE `tipos_movimiento` DISABLE KEYS */;
INSERT INTO `tipos_movimiento` VALUES (1,'ENTRADA'),(2,'SALIDA');
/*!40000 ALTER TABLE `tipos_movimiento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vista_dispositivos_estudiante`
--

DROP TABLE IF EXISTS `vista_dispositivos_estudiante`;
/*!50001 DROP VIEW IF EXISTS `vista_dispositivos_estudiante`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_dispositivos_estudiante` AS SELECT 
 1 AS `id_estudiante`,
 1 AS `numero_documento`,
 1 AS `codigo_estudiantil`,
 1 AS `nombre_completo`,
 1 AS `id_dispositivo`,
 1 AS `marca`,
 1 AS `color`,
 1 AS `codigo_hex`,
 1 AS `alias`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_historial_accesos`
--

DROP TABLE IF EXISTS `vista_historial_accesos`;
/*!50001 DROP VIEW IF EXISTS `vista_historial_accesos`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_historial_accesos` AS SELECT 
 1 AS `id_registro`,
 1 AS `numero_documento`,
 1 AS `codigo_estudiantil`,
 1 AS `estudiante`,
 1 AS `marca`,
 1 AS `color`,
 1 AS `movimiento`,
 1 AS `origen`,
 1 AS `fecha_hora_evento`,
 1 AS `fecha_hora_sincronizado`,
 1 AS `segundos_de_retraso`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vista_dispositivos_estudiante`
--

/*!50001 DROP VIEW IF EXISTS `vista_dispositivos_estudiante`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_dispositivos_estudiante` AS select `e`.`id_estudiante` AS `id_estudiante`,`e`.`numero_documento` AS `numero_documento`,`e`.`codigo_estudiantil` AS `codigo_estudiantil`,concat(`e`.`nombres`,' ',`e`.`apellidos`) AS `nombre_completo`,`de`.`id_dispositivo` AS `id_dispositivo`,`m`.`nombre` AS `marca`,`c`.`nombre` AS `color`,`c`.`codigo_hex` AS `codigo_hex`,`de`.`alias` AS `alias` from (((`estudiantes` `e` join `dispositivos_estudiante` `de` on((`de`.`id_estudiante` = `e`.`id_estudiante`))) join `marcas` `m` on((`m`.`id_marca` = `de`.`id_marca`))) join `colores` `c` on((`c`.`id_color` = `de`.`id_color`))) where ((`e`.`activo` = true) and (`de`.`activo` = true)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_historial_accesos`
--

/*!50001 DROP VIEW IF EXISTS `vista_historial_accesos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_historial_accesos` AS select `h`.`id_registro` AS `id_registro`,`e`.`numero_documento` AS `numero_documento`,`e`.`codigo_estudiantil` AS `codigo_estudiantil`,concat(`e`.`nombres`,' ',`e`.`apellidos`) AS `estudiante`,`m`.`nombre` AS `marca`,`c`.`nombre` AS `color`,`tm`.`nombre` AS `movimiento`,`o`.`nombre` AS `origen`,`h`.`fecha_hora_evento` AS `fecha_hora_evento`,`h`.`fecha_hora_sincronizado` AS `fecha_hora_sincronizado`,timestampdiff(SECOND,`h`.`fecha_hora_evento`,`h`.`fecha_hora_sincronizado`) AS `segundos_de_retraso` from ((((((`historial_accesos` `h` join `dispositivos_estudiante` `de` on((`de`.`id_dispositivo` = `h`.`id_dispositivo`))) join `estudiantes` `e` on((`e`.`id_estudiante` = `de`.`id_estudiante`))) join `marcas` `m` on((`m`.`id_marca` = `de`.`id_marca`))) join `colores` `c` on((`c`.`id_color` = `de`.`id_color`))) join `tipos_movimiento` `tm` on((`tm`.`id_tipo_movimiento` = `h`.`id_tipo_movimiento`))) join `origenes_registro` `o` on((`o`.`id_origen` = `h`.`id_origen`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-11 10:51:56

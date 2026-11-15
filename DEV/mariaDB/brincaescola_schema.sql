-- Estrutura de referência para um banco BrincaEscola DEV vazio; nenhum dado foi exportado.
-- Baseada no esquema de produção, com o DEFINER da view removido.
/*M!999999\- enable the sandbox mode */

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id_categoria` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `emprestimos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `emprestimos` (
  `id_emprestimo` int(11) NOT NULL AUTO_INCREMENT,
  `id_exemplar` int(11) NOT NULL,
  `id_usuario_leitor` int(11) NOT NULL,
  `id_usuario_operador` int(11) NOT NULL,
  `data_emprestimo` timestamp NOT NULL DEFAULT current_timestamp(),
  `data_prevista_devolucao` date NOT NULL,
  `data_devolucao` timestamp NULL DEFAULT NULL,
  `status` enum('aberto','devolvido','atrasado','perda') DEFAULT 'aberto',
  `observacoes` text DEFAULT NULL,
  PRIMARY KEY (`id_emprestimo`),
  KEY `fk_emp_exemplar` (`id_exemplar`),
  KEY `fk_emp_leitor` (`id_usuario_leitor`),
  KEY `fk_emp_operador` (`id_usuario_operador`),
  CONSTRAINT `fk_emp_exemplar` FOREIGN KEY (`id_exemplar`) REFERENCES `exemplares` (`id_exemplar`) ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_leitor` FOREIGN KEY (`id_usuario_leitor`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_operador` FOREIGN KEY (`id_usuario_operador`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `exemplares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `exemplares` (
  `id_exemplar` int(11) NOT NULL AUTO_INCREMENT,
  `id_catalogo` int(11) NOT NULL,
  `id_local` int(11) NOT NULL,
  `codigo_patrimonio` varchar(50) NOT NULL,
  `estado_conservacao` enum('novo','bom','desgastado','danificado','em_manutencao') DEFAULT 'bom',
  `status` enum('disponivel','emprestado','extraviado','baixado') DEFAULT 'disponivel',
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_exemplar`),
  UNIQUE KEY `codigo_patrimonio` (`codigo_patrimonio`),
  KEY `fk_exemplar_catalogo` (`id_catalogo`),
  KEY `fk_exemplar_local` (`id_local`),
  CONSTRAINT `fk_exemplar_catalogo` FOREIGN KEY (`id_catalogo`) REFERENCES `itens_catalogo` (`id_catalogo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_exemplar_local` FOREIGN KEY (`id_local`) REFERENCES `locais` (`id_local`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `itens_catalogo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `itens_catalogo` (
  `id_catalogo` int(11) NOT NULL AUTO_INCREMENT,
  `id_categoria` int(11) NOT NULL,
  `nome` varchar(150) NOT NULL,
  `descricao` text DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_catalogo`),
  KEY `fk_catalogo_categoria` (`id_categoria`),
  CONSTRAINT `fk_catalogo_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `locais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `locais` (
  `id_local` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_local`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `matricula` varchar(30) DEFAULT NULL,
  `nome` varchar(120) NOT NULL,
  `login` varchar(50) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `perfil` enum('admin','educador','responsavel') DEFAULT 'educador',
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `login` (`login`),
  UNIQUE KEY `matricula` (`matricula`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vw_inventario_resumo`;
/*!50001 DROP VIEW IF EXISTS `vw_inventario_resumo`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vw_inventario_resumo` AS SELECT
 1 AS `id_catalogo`,
  1 AS `nome`,
  1 AS `tipo`,
  1 AS `quantidade`,
  1 AS `localizacao` */;
SET character_set_client = @saved_cs_client;
/*!50001 DROP VIEW IF EXISTS `vw_inventario_resumo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY INVOKER */
/*!50001 VIEW `vw_inventario_resumo` AS select `c`.`id_catalogo` AS `id_catalogo`,`c`.`nome` AS `nome`,`cat`.`nome` AS `tipo`,count(`e`.`id_exemplar`) AS `quantidade`,`l`.`nome` AS `localizacao` from (((`itens_catalogo` `c` join `categorias` `cat` on(`c`.`id_categoria` = `cat`.`id_categoria`)) join `exemplares` `e` on(`c`.`id_catalogo` = `e`.`id_catalogo`)) join `locais` `l` on(`e`.`id_local` = `l`.`id_local`)) where `e`.`status` = 'disponivel' group by `c`.`id_catalogo`,`c`.`nome`,`cat`.`nome`,`l`.`nome` */;
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

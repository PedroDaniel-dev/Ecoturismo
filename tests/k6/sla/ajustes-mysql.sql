-- Ajustes do MySQL usados na Medição 2 (rodar como root antes dos testes).
-- Valem até o serviço do MySQL reiniciar; para deixar fixo, coloque os mesmos valores no my.ini, na seção [mysqld].
--
-- Na Medição 1 a vazão de "visitas" despencou depois de ~64 mil visitas gravadas: com 100 MB de redo log o InnoDB
-- precisa parar para descarregar páginas no disco, e com 128 MB de buffer pool os índices de VISITA deixam de caber
-- na memória.

SET GLOBAL innodb_redo_log_capacity = 1073741824;  -- 1 GB (era 100 MB)
SET GLOBAL innodb_buffer_pool_size  = 1073741824;  -- 1 GB (era 128 MB)

SELECT @@innodb_redo_log_capacity / 1024 / 1024 AS redo_log_mb,
       @@innodb_buffer_pool_size / 1024 / 1024  AS buffer_pool_mb;

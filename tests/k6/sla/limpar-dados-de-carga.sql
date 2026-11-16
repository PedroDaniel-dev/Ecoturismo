-- Apaga os usuários criados pelo teste de visitas (e-mails @carga.test) e, em cascata, as visitas deles.
-- Rode depois das medições, se elas foram feitas no banco de desenvolvimento:
--   mysql -u ecoturismo -p ecoturismo < tests/k6/sla/limpar-dados-de-carga.sql

DELETE FROM USUARIO WHERE email LIKE '%@carga.test';

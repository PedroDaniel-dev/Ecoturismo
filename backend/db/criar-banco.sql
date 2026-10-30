-- Cria o banco e o usuário que o backend usa. Rode uma vez, como administrador do MySQL:
--   sudo mysql < backend/db/criar-banco.sql
-- As tabelas e os dados das trilhas NÃO são criados aqui: o backend faz isso sozinho ao iniciar (Flyway).
-- Troque a senha abaixo e, se trocar, defina DB_PASSWORD antes de rodar o backend.

CREATE DATABASE IF NOT EXISTS ecoturismo CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'ecoturismo'@'localhost' IDENTIFIED BY 'ecoturismo123';
GRANT ALL PRIVILEGES ON ecoturismo.* TO 'ecoturismo'@'localhost';
FLUSH PRIVILEGES;

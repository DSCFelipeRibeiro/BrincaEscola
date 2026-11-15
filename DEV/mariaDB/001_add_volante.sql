-- Rodar uma única vez no banco de desenvolvimento antes de iniciar a versão nova.
-- O campo representa o checkbox "Professor volante" da tela de cadastro.
ALTER TABLE usuarios
  ADD COLUMN volante TINYINT(1) NOT NULL DEFAULT 0 AFTER perfil;
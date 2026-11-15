-- Marca a exclusão lógica sem apagar o usuário nem quebrar o histórico de empréstimos.
ALTER TABLE usuarios
  ADD COLUMN data_exclusao DATETIME NULL DEFAULT NULL AFTER criado_em;

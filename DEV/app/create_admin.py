"""Cria ou atualiza o administrador de DEV sem armazenar senha em texto puro."""

from getpass import getpass
import os

import pymysql
from werkzeug.security import generate_password_hash

from app import get_db


def main():
    if os.environ.get("APP_ENV") != "dev":
        raise SystemExit("Este utilitário só pode ser executado com APP_ENV=dev.")
    login = input("Login do administrador [admin]: ").strip() or "admin"
    name = input("Nome do administrador [Administrador do Sistema]: ").strip()
    name = name or "Administrador do Sistema"
    password = getpass("Senha de teste (mínimo 4 caracteres em DEV): ")
    confirm = getpass("Confirme a senha: ")
    if len(password) < 4 or password != confirm:
        raise SystemExit("Em DEV, a senha precisa ter ao menos 4 caracteres e coincidir com a confirmação.")

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_usuario FROM usuarios WHERE login = %s", (login,))
            existing = cursor.fetchone()
            password_hash = generate_password_hash(password)
            if existing:
                cursor.execute(
                    "UPDATE usuarios SET nome = %s, senha_hash = %s, "
                    "perfil = 'admin', ativo = 1 WHERE id_usuario = %s",
                    (name, password_hash, existing["id_usuario"]),
                )
            else:
                cursor.execute(
                    "INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo) "
                    "VALUES (%s, %s, %s, 'admin', 1)",
                    (name, login, password_hash),
                )
        conn.commit()
        print("Administrador DEV criado ou atualizado; senha armazenada em hash.")
    except pymysql.MySQLError:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()

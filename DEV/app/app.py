"""Flask application for BrincaEscola."""

from datetime import date, datetime, timedelta, timezone
from functools import wraps
import logging
import os
import re
import secrets
import unicodedata

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
import pymysql
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash


app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "0") == "1",
    SESSION_COOKIE_NAME=os.environ.get("SESSION_COOKIE_NAME", "session"),
    SESSION_COOKIE_PATH=os.environ.get("SESSION_COOKIE_PATH") or None,
)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
APP_ENV = os.environ.get("APP_ENV", "prod").strip().lower()

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "127.0.0.1"),
    "user": os.environ.get("DB_USER"),
    "password": os.environ.get("DB_PASSWORD"),
    "database": os.environ.get("DB_NAME", "brincaescola_db"),
    "cursorclass": pymysql.cursors.DictCursor,
    "charset": "utf8mb4",
    "autocommit": False,
}

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("brincaescola")
SCHOOL_TIMEZONE = timezone(timedelta(hours=-3))
CATEGORY_ASSET_PREFIXES = {
    "brinquedo": "BRINQ",
    "livro": "LIV",
    "jogo": "JOGO",
    "instrumento musical": "MUS",
    "material pedagógico": "MAT",
    "material esportivo": "ESP",
    "material de artes": "ART",
}
ASSET_CODE_STOP_WORDS = {"A", "AS", "DA", "DAS", "DE", "DO", "DOS", "E", "O", "OS"}
ITEM_ASSET_ABBREVIATIONS = {
    "blocos de montar de madeira": "ENG",
    "bonecas": "BONE",
    "o grande rabanete": "GR",
    "o pequeno principe": "PP",
    "kit cozinha e feirinha": "COZ",
    "kit fantoches dos tres porquinhos": "FANT",
    "flauta": "XIL",
    "jogo da memoria - animais do brasil": "MEM",
    "blocos logicos coloridos": "BLOC",
    "cartoes de letras e numeros": "ALIN",
}


class DatabaseConfigurationError(Exception):
    pass


def get_db():
    if not DB_CONFIG["user"] or not DB_CONFIG["password"]:
        raise DatabaseConfigurationError("Configure DB_USER e DB_PASSWORD no ambiente.")
    return pymysql.connect(**DB_CONFIG)


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            if request.path.startswith("/api/"):
                return jsonify({"message": "Autenticação necessária."}), 401
            return redirect(url_for("login"))
        conn = get_db()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT ativo, data_exclusao FROM usuarios WHERE id_usuario = %s",
                    (user_id,),
                )
                account = cursor.fetchone()
        finally:
            conn.close()
        if not account or not account["ativo"] or account["data_exclusao"] is not None:
            session.clear()
            if request.path.startswith("/api/"):
                return jsonify({"message": "A sessão não está mais ativa."}), 401
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


def admin_required(view):
    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if session.get("perfil") != "admin":
            return jsonify({"message": "Ação permitida somente para administradores."}), 403
        return view(*args, **kwargs)

    return wrapped


def operator_required(view):
    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if session.get("perfil") not in ("admin", "educador"):
            return jsonify({"message": "Ação permitida somente para a equipe escolar."}), 403
        return view(*args, **kwargs)

    return wrapped


def api_error(message, status):
    return jsonify({"message": message}), status


def today_in_school_timezone():
    return datetime.now(SCHOOL_TIMEZONE).date()


def item_asset_abbreviation(item_name):
    normalized = unicodedata.normalize("NFKD", item_name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii").upper()
    legacy_abbreviation = ITEM_ASSET_ABBREVIATIONS.get(ascii_name.lower())
    if legacy_abbreviation:
        return legacy_abbreviation
    words = re.findall(r"[A-Z0-9]+", ascii_name)
    meaningful_words = [word for word in words if word not in ASSET_CODE_STOP_WORDS]
    if not meaningful_words:
        meaningful_words = words
    if len(meaningful_words) == 1:
        return meaningful_words[0][:4]
    abbreviation = "".join(word[0] for word in meaningful_words[:6])
    return abbreviation or "ITEM"


def next_asset_codes(cursor, category_prefix, item_abbreviation, quantity):
    prefix = f"{category_prefix}-{item_abbreviation}-"
    cursor.execute(
        "SELECT codigo_patrimonio FROM exemplares WHERE codigo_patrimonio LIKE %s",
        (f"{prefix}%",),
    )
    sequence_pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$")
    last_sequence = 0
    for row in cursor.fetchall():
        match = sequence_pattern.fullmatch(row["codigo_patrimonio"])
        if match:
            last_sequence = max(last_sequence, int(match.group(1)))
    return [f"{prefix}{number:03d}" for number in range(last_sequence + 1, last_sequence + quantity + 1)]


@app.context_processor
def inject_app_environment():
    return {"app_environment": APP_ENV}


@app.errorhandler(pymysql.MySQLError)
def database_error(error):
    logger.exception("Falha ao acessar o MariaDB")
    return jsonify({"message": "Não foi possível concluir a operação no banco de dados."}), 500


@app.errorhandler(DatabaseConfigurationError)
def configuration_error(error):
    logger.error("Configuração incompleta: %s", error)
    return jsonify({"message": "Banco de dados não configurado neste ambiente."}), 503


@app.route("/")
def index():
    if session.get("user_id"):
        return redirect(url_for("inventario"))
    return redirect(url_for("login"))


@app.route("/login")
def login():
    if session.get("user_id"):
        return redirect(url_for("inventario"))
    return render_template("index.html")


@app.route("/inventario")
@app.route("/inventario_adm.html")
@login_required
def inventario():
    return render_template("inventario_adm.html", user_name=session.get("nome"))


@app.route("/cadastro_usuario")
@app.route("/cadastro_usuario.html")
@login_required
def cadastro_usuario():
    if session.get("perfil") != "admin":
        return redirect(url_for("inventario"))
    return render_template("cadastro_usuario.html")


@app.get("/usuarios")
@login_required
def usuarios():
    if session.get("perfil") != "admin":
        return redirect(url_for("inventario"))
    return render_template("usuarios.html")


@app.get("/emprestimos/historico")
@login_required
def historico_emprestimos():
    return render_template("historico_emprestimos.html")


@app.post("/api/login")
def api_login():
    data = request.get_json(silent=True) or {}
    login = str(data.get("login", "")).strip()
    password = str(data.get("senha", ""))
    if not login or not password:
        return api_error("Preencha os campos de matrícula/login e senha.", 400)

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, nome, perfil, ativo, senha_hash "
                "FROM usuarios WHERE login = %s",
                (login,),
            )
            user = cursor.fetchone()
        if not user or not user["ativo"]:
            return api_error(
                "Matrícula/login ou senha incorretos. "
                "Confira os dados e tente novamente.",
                401,
            )
        try:
            valid_password = check_password_hash(user["senha_hash"], password)
        except (TypeError, ValueError):
            valid_password = False
        if not valid_password:
            return api_error(
                "Matrícula/login ou senha incorretos. "
                "Confira os dados e tente novamente.",
                401,
            )

        session.clear()
        session.update(
            user_id=user["id_usuario"], nome=user["nome"], perfil=user["perfil"]
        )
        return jsonify(
            {
                "status": "success",
                "user": {
                    "id_usuario": user["id_usuario"],
                    "nome": user["nome"],
                    "perfil": user["perfil"],
                },
            }
        )
    finally:
        conn.close()


@app.post("/api/logout")
def api_logout():
    session.clear()
    return jsonify({"status": "success"})


@app.get("/api/session")
@login_required
def api_session():
    return jsonify(
        {
            "id_usuario": session["user_id"],
            "nome": session["nome"],
            "perfil": session["perfil"],
        }
    )


@app.get("/api/usuarios")
@admin_required
def listar_usuarios():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, nome, matricula, criado_em, data_exclusao, ativo "
                "FROM usuarios ORDER BY nome, matricula"
            )
            users = cursor.fetchall()
            for user in users:
                for field in ("criado_em", "data_exclusao"):
                    value = user[field]
                    user[field] = value.strftime("%d/%m/%Y") if value else None
            return jsonify(users)
    finally:
        conn.close()


@app.delete("/api/usuarios/<int:user_id>")
@admin_required
def excluir_usuario(user_id):
    if user_id == session["user_id"]:
        return api_error("Não é possível excluir a própria conta.", 400)

    conn = get_db()
    try:
        conn.begin()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT perfil, ativo, data_exclusao FROM usuarios "
                "WHERE id_usuario = %s FOR UPDATE",
                (user_id,),
            )
            user = cursor.fetchone()
            if not user:
                conn.rollback()
                return api_error("Usuário não encontrado.", 404)
            if user["data_exclusao"] is not None:
                conn.commit()
                return jsonify({"status": "already_deleted"})
            if user["perfil"] == "admin" and user["ativo"]:
                cursor.execute(
                    "SELECT id_usuario FROM usuarios "
                    "WHERE perfil = 'admin' AND ativo = 1 FOR UPDATE"
                )
                active_admins = cursor.fetchall()
                if len(active_admins) <= 1:
                    conn.rollback()
                    return api_error("Não é possível excluir o último administrador ativo.", 409)
            cursor.execute(
                "UPDATE usuarios SET ativo = 0, data_exclusao = NOW() "
                "WHERE id_usuario = %s AND data_exclusao IS NULL",
                (user_id,),
            )
        conn.commit()
        return jsonify({"status": "success"})
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/api/itens")
@login_required
def listar_itens():
    mostrar_leitor = session.get("perfil") in ("admin", "educador")
    hoje = today_in_school_timezone()
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT c.id_catalogo, c.nome, cat.nome AS tipo, e.status AS status_exemplar, "
                "l.nome AS localizacao, emp.status AS status_emprestimo, "
                "emp.data_prevista_devolucao, u.nome AS leitor "
                "FROM itens_catalogo c "
                "JOIN categorias cat ON cat.id_categoria = c.id_categoria "
                "JOIN exemplares e ON e.id_catalogo = c.id_catalogo "
                "LEFT JOIN locais l ON l.id_local = e.id_local "
                "LEFT JOIN emprestimos emp ON emp.id_exemplar = e.id_exemplar "
                "AND emp.status IN ('aberto', 'atrasado') "
                "LEFT JOIN usuarios u ON u.id_usuario = emp.id_usuario_leitor "
                "WHERE e.status = 'disponivel' "
                "OR (e.status = 'emprestado' AND emp.id_emprestimo IS NOT NULL) "
                "ORDER BY c.nome, l.nome, u.nome"
            )
            rows = cursor.fetchall()

        items = {}
        for row in rows:
            item = items.setdefault(
                row["id_catalogo"],
                {
                    "id_catalogo": row["id_catalogo"],
                    "nome": row["nome"],
                    "tipo": row["tipo"],
                    "quantidade": 0,
                    "emprestadas": 0,
                    "localizacoes": {},
                    "emprestimos": [],
                },
            )
            if row["status_exemplar"] == "disponivel":
                item["quantidade"] += 1
                location_name = row["localizacao"] or "Local não informado"
                item["localizacoes"][location_name] = item["localizacoes"].get(location_name, 0) + 1
            else:
                item["emprestadas"] += 1
                if mostrar_leitor:
                    due_date = row["data_prevista_devolucao"]
                    item["emprestimos"].append(
                        {
                            "leitor": row["leitor"] or "Leitor não identificado",
                            "data_prevista_devolucao": due_date.strftime("%d/%m/%Y") if due_date else None,
                            "atrasado": row["status_emprestimo"] == "atrasado"
                            or (due_date is not None and due_date < hoje),
                        }
                    )

        result = []
        for item in items.values():
            item["localizacoes"] = [
                {"nome": name, "quantidade": quantity}
                for name, quantity in item["localizacoes"].items()
            ]
            result.append(item)
        result.sort(
            key=lambda item: (
                -item["quantidade"],
                item["nome"].casefold(),
            )
        )
        return jsonify(result)
    finally:
        conn.close()


@app.post("/api/itens")
@admin_required
def criar_item():
    data = request.get_json(silent=True) or {}
    name = str(data.get("nome", "")).strip()
    try:
        category_id = int(data.get("id_categoria", 0))
        location_id = int(data.get("id_local", 0))
        quantity = int(data.get("quantidade", 0))
    except (TypeError, ValueError):
        return api_error(
            "Selecione um tipo e uma localização e informe a quantidade de exemplares.",
            400,
        )
    if not name or category_id <= 0 or location_id <= 0 or not 1 <= quantity <= 500:
        return api_error(
            "Preencha o nome, selecione o tipo e a localização e informe "
            "uma quantidade entre 1 e 500.",
            400,
        )

    conn = get_db()
    try:
        conn.begin()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT nome FROM categorias WHERE id_categoria = %s FOR UPDATE",
                (category_id,),
            )
            category = cursor.fetchone()
            if not category:
                conn.rollback()
                return api_error(
                    "Esse tipo não está mais disponível. "
                    "Atualize a página e tente novamente.",
                    400,
                )
            category_prefix = CATEGORY_ASSET_PREFIXES.get(category["nome"].strip().casefold())
            if not category_prefix:
                conn.rollback()
                return api_error(
                    "Esse tipo ainda não possui uma sigla de patrimônio configurada.",
                    400,
                )
            cursor.execute(
                "SELECT id_local FROM locais WHERE id_local = %s",
                (location_id,),
            )
            if not cursor.fetchone():
                conn.rollback()
                return api_error(
                    "Essa localização não está mais disponível. "
                    "Atualize a página e tente novamente.",
                    400,
                )
            cursor.execute(
                "INSERT INTO itens_catalogo (id_categoria, nome) VALUES (%s, %s)",
                (category_id, name),
            )
            catalog_id = cursor.lastrowid
            item_abbreviation = item_asset_abbreviation(name)
            asset_codes = next_asset_codes(
                cursor, category_prefix, item_abbreviation, quantity
            )
            specimens = [
                (catalog_id, location_id, code, "disponivel")
                for code in asset_codes
            ]
            cursor.executemany(
                "INSERT INTO exemplares "
                "(id_catalogo, id_local, codigo_patrimonio, status) "
                "VALUES (%s, %s, %s, %s)",
                specimens,
            )
        conn.commit()
        return jsonify({"status": "success", "id_catalogo": catalog_id}), 201
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/api/categorias")
@admin_required
def listar_categorias():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_categoria, nome FROM categorias ORDER BY nome")
            return jsonify(cursor.fetchall())
    finally:
        conn.close()


@app.get("/api/locais")
@login_required
def listar_locais():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_local, nome FROM locais ORDER BY nome")
            return jsonify(cursor.fetchall())
    finally:
        conn.close()


@app.get("/api/exemplares/disponiveis")
@operator_required
def exemplares_disponiveis():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT e.id_exemplar, e.id_catalogo, e.codigo_patrimonio, c.nome, l.nome AS localizacao "
                "FROM exemplares e "
                "JOIN itens_catalogo c ON c.id_catalogo = e.id_catalogo "
                "JOIN locais l ON l.id_local = e.id_local "
                "WHERE e.status = 'disponivel' "
                "AND COALESCE(e.estado_conservacao, 'bom') NOT IN ('em_manutencao', 'danificado') "
                "ORDER BY c.nome, e.codigo_patrimonio"
            )
            return jsonify(cursor.fetchall())
    finally:
        conn.close()


@app.get("/api/emprestimos/abertos")
@operator_required
def emprestimos_abertos():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT emp.id_emprestimo, emp.id_exemplar, emp.data_prevista_devolucao, "
                "e.codigo_patrimonio, c.nome AS item, u.nome AS leitor, u.matricula "
                "FROM emprestimos emp "
                "JOIN exemplares e ON e.id_exemplar = emp.id_exemplar "
                "JOIN itens_catalogo c ON c.id_catalogo = e.id_catalogo "
                "JOIN usuarios u ON u.id_usuario = emp.id_usuario_leitor "
                "WHERE emp.status IN ('aberto', 'atrasado') "
                "ORDER BY emp.data_prevista_devolucao, c.nome"
            )
            rows = cursor.fetchall()
            for row in rows:
                row["data_prevista_devolucao"] = row["data_prevista_devolucao"].isoformat()
            return jsonify(rows)
    finally:
        conn.close()


@app.get("/api/emprestimos/historico")
@login_required
def historico_emprestimos_api():
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            query = (
                "SELECT emp.id_emprestimo, c.nome AS item, e.codigo_patrimonio, "
                "emp.data_emprestimo, emp.data_prevista_devolucao, "
                "emp.data_devolucao, emp.status, u.nome AS leitor, u.matricula "
                "FROM emprestimos emp "
                "JOIN exemplares e ON e.id_exemplar = emp.id_exemplar "
                "JOIN itens_catalogo c ON c.id_catalogo = e.id_catalogo "
                "JOIN usuarios u ON u.id_usuario = emp.id_usuario_leitor "
            )
            if session.get("perfil") == "admin":
                query += "ORDER BY emp.data_emprestimo DESC, emp.id_emprestimo DESC"
                cursor.execute(query)
            else:
                query += (
                    "WHERE emp.id_usuario_leitor = %s "
                    "ORDER BY emp.data_emprestimo DESC, emp.id_emprestimo DESC"
                )
                cursor.execute(query, (session["user_id"],))
            rows = cursor.fetchall()
            today = today_in_school_timezone()
            for row in rows:
                for field in ("data_emprestimo", "data_devolucao"):
                    if row[field]:
                        row[field] = row[field].strftime("%d/%m/%Y")
                due_date = row["data_prevista_devolucao"]
                row["data_prevista_devolucao"] = due_date.strftime("%d/%m/%Y") if due_date else None
                if row["status"] == "aberto" and due_date and due_date < today:
                    row["status"] = "atrasado"
            return jsonify(rows)
    finally:
        conn.close()


@app.post("/api/emprestimos")
@operator_required
def criar_emprestimo():
    data = request.get_json(silent=True) or {}
    try:
        specimen_id = int(data.get("id_exemplar"))
        due_date = date.fromisoformat(str(data.get("data_prevista_devolucao", "")))
    except (TypeError, ValueError):
        return api_error("Selecione um exemplar e informe uma data de devolução válida.", 400)
    matricula = str(data.get("matricula", "")).strip()
    if not matricula:
        return api_error("Informe a matrícula do leitor.", 400)
    if len(matricula) != 4:
        return api_error("A matrícula precisa ter exatamente 4 caracteres.", 400)
    if due_date < today_in_school_timezone():
        return api_error(
            "Informe a matrícula do leitor e uma data de devolução "
            "igual ou posterior a hoje.",
            400,
        )

    conn = get_db()
    try:
        conn.begin()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario FROM usuarios WHERE matricula = %s AND ativo = 1 FOR UPDATE",
                (matricula,),
            )
            reader = cursor.fetchone()
            if not reader:
                conn.rollback()
                return api_error(
                    "Não encontramos um usuário ativo com essa matrícula. "
                    "Confira o número.",
                    404,
                )
            cursor.execute(
                "SELECT status, estado_conservacao FROM exemplares "
                "WHERE id_exemplar = %s FOR UPDATE",
                (specimen_id,),
            )
            specimen = cursor.fetchone()
            if not specimen or specimen["status"] != "disponivel":
                conn.rollback()
                return api_error(
                    "Esse exemplar não está mais disponível. "
                    "Atualize a lista e tente novamente.",
                    409,
                )
            if specimen["estado_conservacao"] in ("em_manutencao", "danificado"):
                conn.rollback()
                return api_error(
                    "Esse exemplar não pode ser emprestado agora: "
                    "está em manutenção ou danificado.",
                    409,
                )
            cursor.execute(
                "SELECT id_emprestimo FROM emprestimos "
                "WHERE id_exemplar = %s AND status IN ('aberto', 'atrasado') LIMIT 1",
                (specimen_id,),
            )
            if cursor.fetchone():
                conn.rollback()
                return api_error("Esse exemplar já tem um empréstimo em aberto. Atualize a lista.", 409)
            cursor.execute(
                "INSERT INTO emprestimos "
                "(id_exemplar, id_usuario_leitor, id_usuario_operador, "
                "data_prevista_devolucao, status) VALUES (%s, %s, %s, %s, 'aberto')",
                (specimen_id, reader["id_usuario"], session["user_id"], due_date),
            )
            loan_id = cursor.lastrowid
            cursor.execute(
                "UPDATE exemplares SET status = 'emprestado' WHERE id_exemplar = %s",
                (specimen_id,),
            )
        conn.commit()
        return jsonify({"status": "success", "id_emprestimo": loan_id}), 201
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.post("/api/emprestimos/<int:loan_id>/devolucao")
@operator_required
def devolver_emprestimo(loan_id):
    conn = get_db()
    try:
        conn.begin()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_exemplar, status FROM emprestimos "
                "WHERE id_emprestimo = %s FOR UPDATE",
                (loan_id,),
            )
            loan = cursor.fetchone()
            if not loan or loan["status"] not in ("aberto", "atrasado"):
                conn.rollback()
                return api_error("Esse empréstimo não está mais em aberto. Atualize a lista.", 404)
            cursor.execute(
                "UPDATE emprestimos SET status = 'devolvido', data_devolucao = NOW() "
                "WHERE id_emprestimo = %s",
                (loan_id,),
            )
            cursor.execute(
                "UPDATE exemplares SET status = 'disponivel' WHERE id_exemplar = %s",
                (loan["id_exemplar"],),
            )
        conn.commit()
        return jsonify({"status": "success"})
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.post("/api/usuarios")
@admin_required
def criar_usuario():
    data = request.get_json(silent=True) or {}
    name = str(data.get("nome", "")).strip()
    matricula = str(data.get("matricula", "")).strip()
    password = str(data.get("senha", ""))
    confirm = str(data.get("confirmar_senha", ""))
    volante = bool(data.get("volante", False))
    if not name:
        return api_error("Informe o nome completo do usuário.", 400)
    if not matricula:
        return api_error("Informe a matrícula; ela também será usada como login.", 400)
    if len(matricula) != 4:
        return api_error("A matrícula precisa ter exatamente 4 caracteres.", 400)
    if len(password) < 8:
        return api_error("A senha precisa ter pelo menos 8 caracteres.", 400)
    if password != confirm:
        return api_error("As senhas não coincidem. Confira os dois campos.", 400)

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO usuarios (matricula, nome, login, senha_hash, perfil, volante) "
                "VALUES (%s, %s, %s, %s, 'educador', %s)",
                (matricula, name, matricula, generate_password_hash(password), volante),
            )
        conn.commit()
        return jsonify({"status": "success", "login": matricula}), 201
    except pymysql.err.IntegrityError:
        conn.rollback()
        return api_error(
            "Essa matrícula já está cadastrada. "
            "Confira o número ou use outra matrícula.",
            409,
        )
    finally:
        conn.close()


if __name__ == "__main__":
    app.run(host=os.environ.get("FLASK_HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "5000")), debug=False)

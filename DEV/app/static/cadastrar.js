const formUsuario = document.getElementById("formUsuario");
const mensagem = document.getElementById("mensagem");
const appBase = document.body.dataset.appBase || "";
const appPath = (path) => `${appBase}${path}`;

function mostrarMensagem(texto, isError = false) {
  mensagem.textContent = texto;
  mensagem.style.color = isError ? "#a52222" : "#176b36";
  mensagem.setAttribute("role", isError ? "alert" : "status");
  mensagem.setAttribute("aria-live", isError ? "assertive" : "polite");
}

formUsuario.addEventListener("submit", async (event) => {
  event.preventDefault();
  mostrarMensagem("");
  const nome = document.getElementById("nome");
  const matricula = document.getElementById("matricula");
  const passwordField = document.getElementById("password1");
  const confirmField = document.getElementById("password2");
  const password = passwordField.value;
  const confirm = confirmField.value;

  nome.setCustomValidity(nome.value.trim() ? "" : "Informe o nome completo.");
  const matriculaValue = matricula.value.trim();
  matricula.setCustomValidity([...matriculaValue].length === 4
    ? ""
    : "A matrícula precisa ter exatamente 4 caracteres.");
  const passwordLength = [...password].length;
  let passwordError = "";
  if (!password) passwordError = "Informe uma senha com pelo menos 8 caracteres.";
  else if (passwordLength < 8) passwordError = "A senha precisa ter pelo menos 8 caracteres.";
  passwordField.setCustomValidity(passwordError);

  let confirmError = "";
  if (!confirm) confirmError = "Confirme a senha.";
  else if (password !== confirm) confirmError = "As senhas não coincidem. Confira os dois campos.";
  confirmField.setCustomValidity(confirmError);
  const campoInvalido = [nome, matricula, passwordField, confirmField].find((campo) => !campo.checkValidity());
  if (campoInvalido) {
    campoInvalido.setAttribute("aria-invalid", "true");
    mostrarMensagem(campoInvalido.validationMessage, true);
    campoInvalido.focus();
    return;
  }

  const button = document.getElementById("btnConfirmar");
  button.disabled = true;
  try {
    const response = await fetch(appPath("/api/usuarios"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.value.trim(),
        matricula: matricula.value.trim(),
        senha: password,
        confirmar_senha: confirm,
        volante: document.getElementById("checkboxVolante").checked,
      }),
    });
    const result = await response.json().catch(() => null);
    if (response.status === 401) {
      window.location.assign(appPath("/"));
      return;
    }
    if (!response.ok) {
      throw new Error((result && result.message) || "Não foi possível cadastrar. Confira os dados e tente novamente.");
    }
    if (!result || !result.login) throw new Error("O servidor enviou uma resposta inválida. Tente novamente.");
    mostrarMensagem(`Usuário cadastrado. O login é ${result.login}.`, false);
    formUsuario.reset();
  } catch (error) {
    mostrarMensagem(error instanceof TypeError
      ? "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente."
      : error.message || "Não foi possível cadastrar. Tente novamente.", true);
  } finally {
    button.disabled = false;
  }
});

formUsuario.addEventListener("input", () => {
  mostrarMensagem("");
  ["nome", "matricula", "password1", "password2"].forEach((id) => {
    const field = document.getElementById(id);
    field.setCustomValidity("");
    field.removeAttribute("aria-invalid");
  });
});

document.getElementById("btnVoltar").addEventListener("click", () => {
  window.location.assign(appPath("/inventario"));
});

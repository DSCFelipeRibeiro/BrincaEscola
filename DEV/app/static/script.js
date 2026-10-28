const formLogin = document.getElementById("formLogin");
const mensagem = document.getElementById("mensagem");
const appBase = document.body.dataset.appBase || "";
const appPath = (path) => `${appBase}${path}`;

function mostrarErro(texto) {
  mensagem.textContent = texto;
  mensagem.setAttribute("role", "alert");
  mensagem.setAttribute("aria-live", "assertive");
}

formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();
  mensagem.textContent = "";
  const login = document.getElementById("login");
  const senha = document.getElementById("senha");
  login.setCustomValidity(login.value.trim() ? "" : "Informe sua matrícula ou seu login.");
  senha.setCustomValidity(senha.value ? "" : "Informe sua senha.");
  const campoInvalido = [login, senha].find((campo) => !campo.checkValidity());
  if (campoInvalido) {
    campoInvalido.setAttribute("aria-invalid", "true");
    mostrarErro(campoInvalido.validationMessage);
    campoInvalido.focus();
    return;
  }

  const button = document.getElementById("btnConfirmar");
  button.disabled = true;

  try {
    const response = await fetch(appPath("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: login.value.trim(),
        senha: senha.value,
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error((result && result.message) || "Não foi possível entrar. Confira seus dados e tente novamente.");
    }
    if (!result || result.status !== "success") throw new Error("O servidor enviou uma resposta inválida. Tente novamente.");
    window.location.assign(appPath("/inventario"));
  } catch (error) {
    mostrarErro(error instanceof TypeError
      ? "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente."
      : error.message || "Não foi possível entrar. Tente novamente.");
  } finally {
    button.disabled = false;
  }
});

formLogin.addEventListener("input", () => {
  mensagem.textContent = "";
  ["login", "senha"].forEach((id) => {
    const field = document.getElementById(id);
    field.setCustomValidity("");
    field.removeAttribute("aria-invalid");
  });
});

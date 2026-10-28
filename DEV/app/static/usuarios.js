const appBase = document.body.dataset.appBase || "";
const appPath = (path) => `${appBase}${path}`;
const message = document.getElementById("mensagem");
const body = document.getElementById("listaUsuarios");
const currentUserId = Number(document.body.dataset.currentUserId);
let users = [];

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#a52222" : "#53666b";
  message.setAttribute("role", isError ? "alert" : "status");
}

function renderUsers() {
  const query = document.getElementById("pesquisa").value.trim().toLocaleLowerCase("pt-BR");
  const visibleUsers = users.filter((user) =>
    `${user.nome} ${user.matricula}`.toLocaleLowerCase("pt-BR").includes(query));
  body.replaceChildren();
  for (const user of visibleUsers) {
    const row = document.createElement("tr");
    for (const value of [user.nome, user.matricula, user.criado_em || "Não informado"]) {
      const cell = document.createElement("td");
      cell.textContent = value || "—";
      row.append(cell);
    }
    const deletionCell = document.createElement("td");
    const deletionStatus = document.createElement("span");
    deletionStatus.className = "status";
    deletionStatus.dataset.deleted = String(Boolean(user.data_exclusao));
    deletionStatus.textContent = user.data_exclusao ? `Sim · ${user.data_exclusao}` : "Não";
    deletionCell.append(deletionStatus);
    row.append(deletionCell);

    const actionsCell = document.createElement("td");
    if (!user.data_exclusao && user.id_usuario !== currentUserId) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "danger";
      deleteButton.dataset.deleteUser = user.id_usuario;
      deleteButton.textContent = "Excluir";
      actionsCell.append(deleteButton);
    } else {
      actionsCell.textContent = user.data_exclusao ? "—" : "Conta atual";
    }
    row.append(actionsCell);
    body.append(row);
  }
  showMessage(visibleUsers.length ? `${visibleUsers.length} usuário${visibleUsers.length === 1 ? "" : "s"}.` : "Nenhum usuário encontrado.");
}

async function deleteUser(userId, button) {
  const user = users.find((candidate) => candidate.id_usuario === userId);
  if (!user || !window.confirm(`Excluir ${user.nome}? O registro e o histórico de empréstimos serão preservados.`)) return;
  button.disabled = true;
  try {
    const response = await fetch(appPath(`/api/usuarios/${userId}`), { method: "DELETE" });
    const result = await response.json().catch(() => null);
    if (response.status === 401) return window.location.assign(appPath("/"));
    if (!response.ok) throw new Error((result && result.message) || "Não foi possível excluir o usuário.");
    await loadUsers();
  } catch (error) {
    showMessage(error instanceof TypeError ? "Não foi possível conectar ao servidor." : error.message, true);
    button.disabled = false;
  }
}

async function loadUsers() {
  showMessage("Carregando usuários…");
  try {
    const response = await fetch(appPath("/api/usuarios"));
    const result = await response.json().catch(() => null);
    if (response.status === 401) return window.location.assign(appPath("/"));
    if (!response.ok) throw new Error((result && result.message) || "Não foi possível carregar os usuários.");
    users = result;
    renderUsers();
  } catch (error) {
    showMessage(error instanceof TypeError ? "Não foi possível conectar ao servidor." : error.message, true);
  }
}

document.getElementById("pesquisa").addEventListener("input", renderUsers);
document.getElementById("btnAtualizar").addEventListener("click", loadUsers);
document.getElementById("btnVoltar").addEventListener("click", () => window.location.assign(appPath("/inventario")));
body.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-delete-user]");
  if (button) deleteUser(Number(button.dataset.deleteUser), button);
});
loadUsers();

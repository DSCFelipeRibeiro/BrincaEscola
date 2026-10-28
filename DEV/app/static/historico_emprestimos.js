const appBase = document.body.dataset.appBase || "";
const appPath = (path) => `${appBase}${path}`;
const message = document.getElementById("mensagem");
const activeSummary = document.getElementById("resumoAndamento");
const body = document.getElementById("listaEmprestimos");
const adminCells = document.querySelectorAll("[data-admin-only]");
let loans = [];
let visibleLoans = [];
let isAdmin = false;
const isInProgress = (loan) => ["aberto", "atrasado"].includes(loan.status);

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#a52222" : "#53666b";
  message.setAttribute("role", isError ? "alert" : "status");
}

function renderLoans() {
  const query = document.getElementById("pesquisa").value.trim().toLocaleLowerCase("pt-BR");
  const status = document.getElementById("filtroStatus").value;
  visibleLoans = loans.filter((loan) => {
    const matchesQuery = `${loan.item} ${loan.codigo_patrimonio} ${loan.leitor || ""} ${loan.matricula || ""}`
      .toLocaleLowerCase("pt-BR").includes(query);
    const matchesStatus = status === "todos"
      || (status === "em_andamento" ? isInProgress(loan) : loan.status === status);
    return matchesQuery && matchesStatus;
  }).sort((first, second) => Number(isInProgress(second)) - Number(isInProgress(first)));
  const inProgressCount = visibleLoans.filter(isInProgress).length;
  document.getElementById("btnExportarCsv").disabled = visibleLoans.length === 0;
  activeSummary.textContent = `Em andamento: ${inProgressCount}`;
  body.replaceChildren();
  for (const loan of visibleLoans) {
    const row = document.createElement("tr");
    const values = [loan.item, loan.codigo_patrimonio];
    if (isAdmin) values.push(`${loan.leitor || "—"}${loan.matricula ? ` (${loan.matricula})` : ""}`);
    values.push(loan.data_emprestimo || "—", loan.data_prevista_devolucao || "—", loan.data_devolucao || "—");
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "status";
    badge.dataset.status = loan.status;
    badge.textContent = ({ aberto: "Em aberto", atrasado: "Atrasado", devolvido: "Devolvido", perda: "Perda" })[loan.status] || loan.status;
    statusCell.append(badge);
    row.append(statusCell);
    body.append(row);
  }
  showMessage(visibleLoans.length
    ? `${visibleLoans.length} empréstimo${visibleLoans.length === 1 ? "" : "s"} exibido${visibleLoans.length === 1 ? "" : "s"}.`
    : "Nenhum empréstimo encontrado.");
}

function csvField(value) {
  const text = String(value ?? "");
  const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function exportCsv() {
  const headers = ["Item", "Patrimônio"];
  if (isAdmin) headers.push("Leitor", "Matrícula");
  headers.push("Data do empréstimo", "Devolução prevista", "Data da devolução", "Situação");
  const statusLabels = { aberto: "Em aberto", atrasado: "Atrasado", devolvido: "Devolvido", perda: "Perda" };
  const rows = visibleLoans.map((loan) => {
    const values = [loan.item, loan.codigo_patrimonio];
    if (isAdmin) values.push(loan.leitor, loan.matricula);
    values.push(
      loan.data_emprestimo,
      loan.data_prevista_devolucao,
      loan.data_devolucao,
      statusLabels[loan.status] || loan.status,
    );
    return values.map(csvField).join(",");
  });
  const csv = `\uFEFF${[headers.map(csvField).join(","), ...rows].join("\r\n")}`;
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  link.href = blobUrl;
  link.download = `historico-emprestimos-${date}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  showMessage(`${visibleLoans.length} empréstimo${visibleLoans.length === 1 ? "" : "s"} exportado${visibleLoans.length === 1 ? "" : "s"} para CSV.`);
}

async function loadLoans() {
  showMessage("Carregando histórico…");
  try {
    const [sessionResponse, loansResponse] = await Promise.all([
      fetch(appPath("/api/session")),
      fetch(appPath("/api/emprestimos/historico")),
    ]);
    if (sessionResponse.status === 401 || loansResponse.status === 401) return window.location.assign(appPath("/"));
    const [user, result] = await Promise.all([
      sessionResponse.json().catch(() => null),
      loansResponse.json().catch(() => null),
    ]);
    if (!sessionResponse.ok || !loansResponse.ok) throw new Error((result && result.message) || "Não foi possível carregar o histórico.");
    isAdmin = user?.perfil === "admin";
    adminCells.forEach((cell) => { cell.hidden = !isAdmin; });
    loans = result;
    renderLoans();
  } catch (error) {
    showMessage(error instanceof TypeError ? "Não foi possível conectar ao servidor." : error.message, true);
  }
}

document.getElementById("pesquisa").addEventListener("input", renderLoans);
document.getElementById("filtroStatus").addEventListener("change", renderLoans);
document.getElementById("btnAtualizar").addEventListener("click", loadLoans);
document.getElementById("btnExportarCsv").addEventListener("click", exportCsv);
document.getElementById("btnVoltar").addEventListener("click", () => window.location.assign(appPath("/inventario")));
loadLoans();

const gradeItens = document.getElementById("gradeItens");
const pesquisa = document.getElementById("pesquisa");
const filtroTipo = document.getElementById("filtroTipo");
const contagemResultados = document.getElementById("contagemResultados");
const limparFiltros = document.getElementById("limparFiltros");
const mensagem = document.getElementById("mensagem");
const appBase = document.body.dataset.appBase || "";
const appPath = (path) => `${appBase}${path}`;
const modalCadastro = document.getElementById("modalCadastro");
const modalEmprestimo = document.getElementById("modalEmprestimo");
const modalDevolucao = document.getElementById("modalDevolucao");
let itens = [];
let perfilAtual = "";

const imagensPorTipo = new Map([
  ["brinquedo", "brinquedo"],
  ["jogo", "jogo"],
  ["livro", "livro"],
  ["instrumento musical", "instrumento-musical"],
  ["material pedagógico", "material-pedagogico"],
  ["material esportivo", "material-esportivo"],
  ["material de artes", "material-de-artes"],
]);
const baseImagensTipo = document.querySelector("main").dataset.categoryImageBase;
const versaoImagensTipo = "category-icons-20261028-v34";

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(appPath(path), {
      credentials: "same-origin",
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.");
  }
  if (response.status === 401) {
    window.location.assign(appPath("/"));
    throw new Error("Sessão encerrada.");
  }
  let result = null;
  if (response.status !== 204) {
    try {
      result = await response.json();
    } catch {
      if (response.ok) throw new Error("O servidor retornou uma resposta inválida.");
    }
  }
  if (!response.ok) {
    throw new Error((result && result.message) || "Não foi possível concluir a operação. Tente novamente.");
  }
  return result;
}

function showMessage(text, isError = false) {
  mensagem.textContent = text;
  mensagem.style.color = isError ? "#a52222" : "#176b36";
  mensagem.setAttribute("role", isError ? "alert" : "status");
  mensagem.setAttribute("aria-live", isError ? "assertive" : "polite");
}

function showFormMessage(form, text, isError = true) {
  const output = form.querySelector("[data-form-message]");
  output.textContent = text;
  output.hidden = !text;
  output.setAttribute("role", isError ? "alert" : "status");
  output.setAttribute("aria-live", isError ? "assertive" : "polite");
}

function validarFormulario(form, regras) {
  for (const [field, message] of regras) {
    field.setCustomValidity(message);
    field.removeAttribute("aria-invalid");
  }
  const invalidField = [...form.elements].find((field) => field.willValidate && !field.checkValidity());
  if (!invalidField) return true;
  invalidField.setAttribute("aria-invalid", "true");
  showFormMessage(form, invalidField.validationMessage);
  invalidField.focus();
  return false;
}

document.querySelectorAll("dialog form").forEach((form) => {
  const clearFeedback = () => {
    showFormMessage(form, "");
    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute("aria-invalid"));
  };
  form.addEventListener("input", clearFeedback);
  form.addEventListener("change", clearFeedback);
});

function criarCartao(item) {
  const podeEmprestar = ["admin", "educador"].includes(perfilAtual);
  const card = document.createElement("article");
  card.className = "item-card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "item-image-wrap";
  const image = document.createElement("img");
  const tipoNormalizado = String(item.tipo || "").trim().toLocaleLowerCase("pt-BR");
  const slug = imagensPorTipo.get(tipoNormalizado) || "categoria-generica";
  image.className = "item-image";
  image.src = `${baseImagensTipo}${slug}.svg?v=${versaoImagensTipo}`;
  image.alt = "";
  image.width = 160;
  image.height = 120;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    image.src = `${baseImagensTipo}categoria-generica.svg?v=${versaoImagensTipo}`;
  }, { once: true });
  imageWrap.appendChild(image);

  const body = document.createElement("div");
  body.className = "item-card-body";
  const title = document.createElement("h2");
  title.textContent = item.nome;
  const meta = document.createElement("div");
  meta.className = "item-card-meta";
  const type = document.createElement("span");
  type.className = "item-type";
  type.textContent = item.tipo;
  const availability = document.createElement("span");
  availability.className = "item-availability";
  availability.classList.toggle("item-unavailable", item.quantidade === 0);
  availability.textContent = item.quantidade === 0
    ? "0 disponíveis"
    : item.quantidade === 1
      ? "1 disponível"
      : `${item.quantidade} disponíveis`;
  meta.append(type, availability);
  if (item.emprestadas > 0) {
    const loanedCount = document.createElement("span");
    loanedCount.className = "item-loaned-count";
    loanedCount.textContent = `${item.emprestadas} emprestado${item.emprestadas === 1 ? "" : "s"}`;
    meta.appendChild(loanedCount);
  }

  const locations = document.createElement("ul");
  locations.className = "item-locations";
  locations.setAttribute("aria-label", "Localização e quantidade");
  for (const local of item.localizacoes) {
    const entry = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = local.nome;
    const quantity = document.createElement("strong");
    quantity.textContent = `${local.quantidade} unidade${local.quantidade === 1 ? "" : "s"}`;
    entry.append(name, quantity);
    locations.appendChild(entry);
  }
  body.append(title, meta);
  if (item.localizacoes.length) body.appendChild(locations);
  if (item.emprestimos.length) {
    const loanDetails = document.createElement("details");
    loanDetails.className = "item-loans";
    const summary = document.createElement("summary");
    const loanCount = item.emprestimos.length;
    summary.textContent = loanCount === 1
      ? "Ver detalhes do empréstimo"
      : `Ver detalhes dos ${loanCount} empréstimos`;
    const loans = document.createElement("ul");
    loans.className = "item-loans-list";
    loans.setAttribute("aria-label", "Pessoas e prazos dos empréstimos em aberto");
    loans.tabIndex = 0;
    for (const loan of item.emprestimos) {
      const entry = document.createElement("li");
      const borrower = document.createElement("strong");
      borrower.textContent = `Com: ${loan.leitor}`;
      entry.appendChild(borrower);
      if (loan.data_prevista_devolucao) {
        const due = document.createElement("span");
        due.textContent = `${loan.atrasado ? "Atrasado · " : ""}Devolução prevista: ${loan.data_prevista_devolucao}`;
        if (loan.atrasado) due.className = "loan-overdue";
        entry.appendChild(due);
      }
      loans.appendChild(entry);
    }
    loanDetails.append(summary, loans);
    body.appendChild(loanDetails);
  }
  if (podeEmprestar && item.quantidade > 0) {
    const action = document.createElement("button");
    action.className = "item-card-cta";
    action.type = "button";
    action.textContent = "Emprestar este item";
    action.setAttribute("aria-label", `Emprestar ${item.nome}`);
    action.addEventListener("click", () => abrirModalEmprestimo(item.id_catalogo));
    body.appendChild(action);
  }
  card.append(imageWrap, body);
  return card;
}

function renderizarCartoes() {
  const query = pesquisa.value.trim().toLocaleLowerCase("pt-BR");
  const type = filtroTipo.value;
  const filtered = itens.filter((item) => {
    const matchesText = [item.nome, item.tipo, ...item.localizacoes.map((local) => local.nome)]
      .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(query));
    return matchesText && (type === "todos" || item.tipo === type);
  });

  contagemResultados.textContent = `${filtered.length} ${filtered.length === 1 ? "item" : "itens"}`;
  const filtrosAtivos = Boolean(query) || type !== "todos";
  limparFiltros.hidden = !filtrosAtivos;
  gradeItens.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.setAttribute("role", "status");
    const text = document.createElement("p");
    text.textContent = filtrosAtivos
      ? "Nenhum item encontrado com esses critérios. Ajuste a busca ou use “Limpar filtros” para recomeçar."
      : "Não há itens disponíveis no acervo no momento.";
    empty.appendChild(text);
    gradeItens.appendChild(empty);
    return;
  }
  for (const item of filtered) gradeItens.appendChild(criarCartao(item));
}

async function carregarItens() {
  itens = await api("/api/itens");
  const currentType = filtroTipo.value;
  const types = [...new Set(itens.map((item) => item.tipo).filter(Boolean))].sort();
  filtroTipo.replaceChildren(new Option("Todos os tipos", "todos"));
  for (const type of types) filtroTipo.add(new Option(type, type));
  if (types.includes(currentType)) filtroTipo.value = currentType;
  renderizarCartoes();
}

async function iniciar() {
  try {
    const user = await api("/api/session");
    perfilAtual = user.perfil;
    document.querySelectorAll("[data-admin-only]").forEach((element) => {
      element.hidden = perfilAtual !== "admin";
    });
    document.querySelectorAll("[data-staff-only]").forEach((element) => {
      element.hidden = !["admin", "educador"].includes(perfilAtual);
    });
    await carregarItens();
  } catch (error) {
    if (error.message !== "Sessão encerrada.") showMessage(error.message, true);
  }
}

function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog.open) dialog.close();
}

pesquisa.addEventListener("input", renderizarCartoes);
filtroTipo.addEventListener("change", renderizarCartoes);

function limparBuscaEFiltros() {
  pesquisa.value = "";
  filtroTipo.value = "todos";
  renderizarCartoes();
  pesquisa.focus();
}

limparFiltros.addEventListener("click", limparBuscaEFiltros);

document.getElementById("btnLogout").addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST" });
    window.location.assign(appPath("/"));
  } catch (error) {
    showMessage(error.message, true);
  }
});

async function carregarOpcoesCadastro() {
  const [categories, locations] = await Promise.all([
    api("/api/categorias"),
    api("/api/locais"),
  ]);
  const categorySelect = document.getElementById("tipoItem");
  const locationSelect = document.getElementById("localItem");
  categorySelect.replaceChildren(new Option("Selecione um tipo", ""));
  locationSelect.replaceChildren(new Option("Selecione uma localização", ""));
  for (const category of categories) {
    categorySelect.add(new Option(category.nome, category.id_categoria));
  }
  for (const location of locations) {
    locationSelect.add(new Option(location.nome, location.id_local));
  }
}

document.getElementById("btnCadastrar").addEventListener("click", async () => {
  try {
    await carregarOpcoesCadastro();
    showFormMessage(document.getElementById("formItem"), "");
    modalCadastro.showModal();
  } catch (error) {
    showMessage(error.message, true);
  }
});
document.getElementById("cancel").addEventListener("click", () => closeDialog("modalCadastro"));
document.getElementById("btnCadUsuario").addEventListener("click", () => window.location.assign(appPath("/cadastro_usuario")));

document.getElementById("formItem").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = document.getElementById("nomeItem");
  const category = document.getElementById("tipoItem");
  const quantity = document.getElementById("qtdItem");
  const location = document.getElementById("localItem");
  const quantityValue = Number(quantity.value);
  if (!validarFormulario(form, [
    [name, name.value.trim() ? "" : "Informe o nome do item."],
    [category, category.value ? "" : "Selecione o tipo do item."],
    [quantity, Number.isInteger(quantityValue) && quantityValue >= 1 && quantityValue <= 500
      ? ""
      : "Informe uma quantidade inteira entre 1 e 500."],
    [location, location.value ? "" : "Selecione onde os exemplares ficarão guardados."],
  ])) return;

  try {
    await api("/api/itens", {
      method: "POST",
      body: JSON.stringify({
        nome: document.getElementById("nomeItem").value.trim(),
        id_categoria: Number(document.getElementById("tipoItem").value),
        quantidade: Number(document.getElementById("qtdItem").value),
        id_local: Number(document.getElementById("localItem").value),
      }),
    });
    form.reset();
    closeDialog("modalCadastro");
    await carregarItens();
    showMessage("Item cadastrado.");
  } catch (error) {
    showFormMessage(form, error.message);
  }
});

async function abrirModalEmprestimo(idCatalogo = null) {
  try {
    const allSpecimens = await api("/api/exemplares/disponiveis");
    const specimens = idCatalogo === null
      ? allSpecimens
      : allSpecimens.filter((specimen) => Number(specimen.id_catalogo) === Number(idCatalogo));
    const select = document.getElementById("exemplarId");
    select.replaceChildren(new Option("Selecione um exemplar", ""));
    for (const specimen of specimens) {
      const label = specimen.nome + " — " + specimen.codigo_patrimonio + " — " + specimen.localizacao;
      select.add(new Option(label, specimen.id_exemplar));
    }
    if (!specimens.length) {
      showMessage(idCatalogo === null
        ? "Não há exemplares disponíveis."
        : "Não há exemplares disponíveis para este item.", true);
      return;
    }
    showFormMessage(document.getElementById("formEmprestimo"), "");
    if (idCatalogo !== null && specimens.length === 1) {
      select.value = String(specimens[0].id_exemplar);
    }
    const due = document.getElementById("dataPrevista");
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    due.min = today.toISOString().slice(0, 10);
    modalEmprestimo.showModal();
  } catch (error) {
    showMessage(error.message, true);
  }
}

document.getElementById("pegar").addEventListener("click", () => abrirModalEmprestimo());

document.getElementById("formEmprestimo").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const specimen = document.getElementById("exemplarId");
  const reader = document.getElementById("matriculaLeitor");
  const dueDate = document.getElementById("dataPrevista");
  const dueDateIsValid = dueDate.value && (!dueDate.min || dueDate.value >= dueDate.min);
  if (!validarFormulario(form, [
    [specimen, specimen.value ? "" : "Selecione o exemplar que será emprestado."],
    [reader, [...reader.value.trim()].length === 4 ? "" : "A matrícula precisa ter exatamente 4 caracteres."],
    [dueDate, !dueDate.value
      ? "Informe a data prevista para devolução."
      : dueDateIsValid ? "" : "A devolução precisa ser prevista para hoje ou uma data futura."],
  ])) return;

  try {
    await api("/api/emprestimos", {
      method: "POST",
      body: JSON.stringify({
        id_exemplar: document.getElementById("exemplarId").value,
        matricula: document.getElementById("matriculaLeitor").value.trim(),
        data_prevista_devolucao: document.getElementById("dataPrevista").value,
      }),
    });
    form.reset();
    closeDialog("modalEmprestimo");
    await carregarItens();
    showMessage("Empréstimo registrado.");
  } catch (error) {
    showFormMessage(form, error.message);
  }
});

document.getElementById("devolver").addEventListener("click", async () => {
  try {
    const loans = await api("/api/emprestimos/abertos");
    const select = document.getElementById("emprestimoId");
    select.replaceChildren(new Option("Selecione um empréstimo", ""));
    for (const loan of loans) {
      const label = loan.item + " — " + loan.codigo_patrimonio + " — " + loan.leitor +
        " (matrícula " + loan.matricula + ", prazo " + loan.data_prevista_devolucao + ")";
      select.add(new Option(label, loan.id_emprestimo));
    }
    if (!loans.length) {
      showMessage("Não há empréstimos em aberto.");
      return;
    }
    select.value = "";
    showFormMessage(document.getElementById("formDevolucao"), "");
    modalDevolucao.showModal();
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.getElementById("formDevolucao").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const loanSelect = document.getElementById("emprestimoId");
  if (!validarFormulario(form, [
    [loanSelect, loanSelect.value ? "" : "Selecione o empréstimo que foi devolvido."],
  ])) return;

  try {
    const loanId = loanSelect.value;
    await api("/api/emprestimos/" + encodeURIComponent(loanId) + "/devolucao", { method: "POST" });
    closeDialog("modalDevolucao");
    await carregarItens();
    showMessage("Devolução registrada.");
  } catch (error) {
    showFormMessage(form, error.message);
  }
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => closeDialog(button.dataset.close));
});

iniciar();

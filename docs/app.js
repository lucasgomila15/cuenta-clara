import { categories, parseAmount, validate, forMonth, summarize, readEntries, saveEntry, deleteEntry } from "./ledger.js";

const $ = id => document.getElementById(id);
const today = new Date();
const iso = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
let month = new Date(today.getFullYear(), today.getMonth(), 1);
let filter = "all";
let editing = null;
let entries = [];
const demo = new URLSearchParams(location.search).has("ejemplo");
const money = cents => (cents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: cents % 100 ? 2 : 0 });
const monthFormat = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const icons = { Comida: "C", Transporte: "T", Vivienda: "V", Salud: "S", Ocio: "O", Sueldo: "S", "Trabajo extra": "T", Otros: "•" };

function element(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

function notice(message) {
  $("notice").textContent = message;
  $("notice").hidden = !message;
}

if (demo) {
  $("demoLink").textContent = "Volver a mis cuentas";
  $("demoLink").href = location.pathname;
  $("storageLabel").textContent = "Ejemplo con datos ficticios";
  const samples = [
    ["Sueldo del mes", "income", "Sueldo", 520000, 1],
    ["Alquiler", "expense", "Vivienda", 180000, 2],
    ["Compra del súper", "expense", "Comida", 36900, 4],
    ["Carga de transporte", "expense", "Transporte", 8500, 5],
    ["Cine", "expense", "Ocio", 7200, 6],
  ];
  entries = samples.map(([description, kind, category, pesos, day], i) => ({
    id: String(i), description, kind, category, cents: pesos * 100, date: iso(new Date(today.getFullYear(), today.getMonth(), Math.min(day, today.getDate())))
  }));
  notice("Estás en el ejemplo. Podés probar cambios acá hasta que cierres o recargues la página.");
}

function render() {
  if (!demo) {
    try {
      entries = readEntries(localStorage);
      $("add").disabled = false;
      notice("");
    } catch {
      entries = [];
      $("add").disabled = true;
      notice("No se pudieron leer los datos del navegador. Revisá el almacenamiento y volvé a abrir la página.");
    }
  }
  const key = iso(month).slice(0, 7);
  const rows = forMonth(entries, key);
  const totals = summarize(rows);
  $("monthText").textContent = monthFormat.format(month);
  for (const name of ["income", "expense", "balance"]) $(name).textContent = money(totals[name]);
  for (const name of ["income", "expense"]) {
    const count = rows.filter(row => row.kind === name).length;
    $(name + "Count").textContent = count + (count === 1 ? " movimiento" : " movimientos");
  }
  const shown = rows.filter(e => filter === "all" || e.kind === filter);
  $("rows").replaceChildren();
  for (const e of shown) {
    const button = element("button", undefined, "row");
    button.setAttribute("aria-label", "Editar " + e.description + ", " + money(e.cents));
    const detail = element("span", undefined, "detail");
    detail.append(element("strong", e.description), element("small", dayFormat.format(new Date(e.date + "T12:00:00")) + " · " + e.category));
    button.append(element("span", icons[e.category], "avatar " + e.kind), detail, element("strong", (e.kind === "income" ? "+" : "−") + money(e.cents), "value " + e.kind), element("span", "›", "chevron"));
    button.onclick = () => openEditor(e);
    $("rows").append(button);
  }
  if (!shown.length) {
    const empty = element("div", undefined, "empty");
    empty.append(element("span", "≡", "emptyMark"), element("strong", rows.length ? "Sin movimientos de este tipo" : "Tu mes empieza acá"), element("p", rows.length ? "Probá con otro filtro." : "Agregá un ingreso o un gasto para empezar."));
    $("rows").append(empty);
  }
  $("categories").replaceChildren();
  for (const [label, cents] of totals.spending) {
    const group = element("div", undefined, "category");
    const heading = element("div");
    heading.append(element("span", label), element("strong", money(cents)));
    const track = element("div", undefined, "track");
    const fill = element("i");
    fill.style.width = (100 * cents / totals.expense) + "%";
    track.append(fill);
    group.append(heading, track);
    $("categories").append(group);
  }
  if (!totals.spending.length) $("categories").append(element("p", "Cuando cargues un gasto, vas a ver cuánto destinaste a cada categoría.", "muted"));
  $("prev").disabled = key === "1000-01";
  $("next").disabled = key === "9999-12";
}

function updateCategories() {
  $("category").replaceChildren(...categories[$("kind").value].map(name => new Option(name, name)));
}

function openEditor(entry) {
  editing = entry || null;
  $("formTitle").textContent = editing ? "Editar movimiento" : "Nuevo movimiento";
  $("kind").value = entry?.kind || "expense";
  updateCategories();
  if (entry) $("category").value = entry.category;
  $("description").value = entry?.description || "";
  $("amount").value = entry ? (entry.cents / 100).toFixed(2).replace(".", ",") : "";
  $("date").value = entry?.date || (iso(month).slice(0,7) === iso(today).slice(0,7) ? iso(today) : iso(month));
  $("remove").hidden = !entry;
  $("error").textContent = "";
  $("editor").showModal();
  $("description").focus();
}

function checkCurrent() {
  if (!demo && editing) {
    const current = readEntries(localStorage).find(e => e.id === editing.id);
    if (JSON.stringify(current) !== JSON.stringify(editing)) throw new Error("Este movimiento cambió en otra pestaña. Cerrá esta ventana y volvé a abrirlo.");
  }
}

$("form").onsubmit = event => {
  event.preventDefault();
  try {
    const entry = validate({ kind: $("kind").value, category: $("category").value, description: $("description").value.trim(), date: $("date").value, cents: parseAmount($("amount").value) });
    checkCurrent();
    const id = editing?.id || crypto.randomUUID();
    if (demo) entries = [...entries.filter(e => e.id !== id), { ...entry, id }];
    else saveEntry(localStorage, id, entry);
    month = new Date(entry.date.slice(0,7) + "-01T12:00:00");
    selectFilter("all");
    $("editor").close();
  } catch (e) { $("error").textContent = e instanceof DOMException ? "No se pudo guardar. Revisá el espacio y los permisos del navegador." : e.message; }
};
$("remove").onclick = () => {
  if (!editing || !confirm('¿Eliminar "' + editing.description + '"?')) return;
  try {
    checkCurrent();
    if (demo) entries = entries.filter(e => e.id !== editing.id);
    else deleteEntry(localStorage, editing.id);
    $("editor").close();
    render();
  } catch (e) { $("error").textContent = e.message; }
};
function selectFilter(value) {
  filter = value;
  document.querySelectorAll("[data-filter]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === value)));
  render();
}
document.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => selectFilter(b.dataset.filter));
$("prev").onclick = () => { month.setMonth(month.getMonth() - 1); render(); };
$("next").onclick = () => { month.setMonth(month.getMonth() + 1); render(); };
$("kind").onchange = updateCategories;
$("add").onclick = () => openEditor(null);
$("close").onclick = () => $("editor").close();
window.addEventListener("storage", () => { if (!demo) render(); });
render();

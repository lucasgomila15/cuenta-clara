export const categories = {
  expense: ["Comida", "Transporte", "Vivienda", "Salud", "Ocio", "Otros"],
  income: ["Sueldo", "Trabajo extra", "Otros"],
};

export function parseAmount(value) {
  const parts = /^(\d{1,10})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!parts) throw new Error("Ingresá un importe sin puntos de miles y con hasta dos decimales.");
  const cents = Number(parts[1]) * 100 + Number((parts[2] || "").padEnd(2, "0"));
  if (!cents) throw new Error("El importe debe ser mayor que cero.");
  return cents;
}

export function validate(entry) {
  if (!entry || !Object.hasOwn(categories, entry.kind) || !categories[entry.kind].includes(entry.category)) throw new Error("Elegí una categoría válida.");
  if (typeof entry.description !== "string" || !entry.description.trim() || entry.description.length > 80) throw new Error("Escribí una descripción de hasta 80 caracteres.");
  if (!Number.isSafeInteger(entry.cents) || entry.cents < 1 || entry.cents > 999999999999) throw new Error("Revisá el importe.");
  if (!/^[1-9]\d{3}-\d\d-\d\d$/.test(entry.date)) throw new Error("Revisá la fecha.");
  const timestamp = Date.parse(entry.date + "T00:00:00Z");
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== entry.date) throw new Error("Revisá la fecha.");
  return entry;
}

export function forMonth(entries, month) {
  return entries.filter(e => e.date.slice(0, 7) === month).sort((a, b) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description, "es"));
}

export function summarize(entries) {
  let income = 0, expense = 0;
  const spending = new Map();
  for (const e of entries) {
    if (e.kind === "income") income += e.cents;
    else {
      expense += e.cents;
      spending.set(e.category, (spending.get(e.category) || 0) + e.cents);
    }
  }
  return { income, expense, balance: income - expense, spending: [...spending].sort((a, b) => b[1] - a[1]) };
}

const prefix = "cuentaclara.v1.";
export function readEntries(storage) {
  const entries = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) entries.push({ ...validate(JSON.parse(storage.getItem(key))), id: key.slice(prefix.length) });
  }
  return entries;
}

export function saveEntry(storage, id, entry) {
  storage.setItem(prefix + id, JSON.stringify(validate(entry)));
}

export function deleteEntry(storage, id) {
  storage.removeItem(prefix + id);
}

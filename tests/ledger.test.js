import test from "node:test";
import assert from "node:assert/strict";
import { parseAmount, validate, forMonth, summarize, readEntries, saveEntry, deleteEntry } from "../docs/ledger.js";

function entry(changes = {}) {
  return { date: "2024-02-29", description: "Almuerzo", kind: "expense", category: "Comida", cents: 12550, ...changes };
}

function memoryStorage() {
  const items = new Map();
  return {
    get length() { return items.size; },
    key: index => [...items.keys()][index],
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
}

test("convierte pesos a centavos sin redondear el importe", () => {
  for (const [input, cents] of [["0,01", 1], ["1.1", 110], [" 15 ", 1500], ["9999999999,99", 999999999999]]) {
    assert.equal(parseAmount(input), cents);
  }
});

test("rechaza ceros, negativos y formatos ambiguos", () => {
  for (const input of ["", "0,00", "-5", "1.234", "1.234,00", "2e2", "99999999999"]) {
    assert.throws(() => parseAmount(input));
  }
});

test("acepta fechas reales y rechaza días inexistentes", () => {
  assert.doesNotThrow(() => validate(entry()));
  for (const date of ["2023-02-29", "2024-02-30", "2024-13-09", ""]) {
    assert.throws(() => validate(entry({ date })));
  }
});

test("valida tipo, categoría, descripción e importe antes de guardar", () => {
  for (const invalid of [{ kind: "transfer" }, { category: "Sueldo" }, { description: " " }, { cents: 1.1 }]) {
    assert.throws(() => validate(entry(invalid)));
  }
});

test("filtra por mes y año y muestra primero los movimientos más recientes", () => {
  const rows = ["2024-02-01", "2025-02-22", "2024-03-01", "2024-02-29"].map(date => entry({ date }));
  assert.deepEqual(forMonth(rows, "2024-02").map(row => row.date), ["2024-02-29", "2024-02-01"]);
  assert.equal(rows[0].date, "2024-02-01");
});

test("agrupa gastos por categoría y calcula el saldo en centavos", () => {
  const rows = [entry(), entry({ cents: 50 }), entry({ category: "Ocio", cents: 300 }), entry({ kind: "income", category: "Sueldo", cents: 10000 })];
  assert.deepEqual(summarize(rows), { income: 10000, expense: 12900, balance: -2900, spending: [["Comida", 12600], ["Ocio", 300]] });
  assert.equal(summarize([]).balance, 0);
});

test("editar y borrar solo afecta el movimiento elegido", () => {
  const storage = memoryStorage();
  storage.setItem("otra-app", "contenido");
  saveEntry(storage, "uno", entry());
  saveEntry(storage, "dos", entry({ cents: 525 }));
  saveEntry(storage, "uno", entry({ cents: 2500 }));
  assert.throws(() => saveEntry(storage, "uno", entry({ cents: -3 })));
  assert.deepEqual(readEntries(storage).map(e => e.cents), [2500, 525]);
  deleteEntry(storage, "uno");
  assert.deepEqual(readEntries(storage).map(e => e.id), ["dos"]);
  assert.equal(storage.getItem("otra-app"), "contenido");
});

test("una entrada ilegible se informa sin borrar los datos existentes", () => {
  const storage = memoryStorage();
  saveEntry(storage, "uno", entry());
  storage.setItem("cuentaclara.v1.dos", "{");
  assert.throws(() => readEntries(storage));
  assert.equal(storage.length, 2);
});

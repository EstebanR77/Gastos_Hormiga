export type ReceiptData = { establishment: string; amount: string; date: string };

function amountNumber(raw: string): number {
  let s = raw.replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  const last = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  if (last >= 0 && s.length - last - 1 === 2) {
    s = s.slice(0, last).replace(/[.,]/g, '') + '.' + s.slice(last + 1);
  } else {
    s = s.replace(/[.,]/g, '');
  }
  return Number(s);
}

export function validDate(value: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function normalizeDate(raw: string): string {
  const parts = raw.replace(/[.\-]/g, '/').split('/').map(Number);
  if (parts.length !== 3) return '';
  let [a, b, c] = parts;
  if (a > 1900) [a, b, c] = [c, b, a];
  if (c < 100) c += c >= 70 ? 1900 : 2000;
  const formatted = `${String(a).padStart(2, '0')}/${String(b).padStart(2, '0')}/${c}`;
  return validDate(formatted) ? formatted : '';
}

export function parseReceipt(text: string): ReceiptData {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const moneyRegex = /\$?\s*\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\$\s*\d{3,8}|\b\d{4,8}(?:[.,]\d{2})?\b/g;
  const candidates: { value: number; score: number }[] = [];

  lines.forEach((line, i) => {
    const normalized = line.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const isTotal = /\b(TOTAL|TOTAl|T0TAL|A\s*PAGAR|IMPORTE\s*TOTAL|VALOR\s*PAGADO)\b/.test(normalized);
    const excluded = /SUB\s*TOTAL|IVA|IMPUESTO|CAMBIO|DESCUENTO|AHORRO|NIT|FACTURA|TEL[EÉ]FONO|REFERENCIA|CODIGO|C[OÓ]DIGO|EFECTIVO|RECIBIDO/.test(normalized);
    const values = [...line.matchAll(moneyRegex)]
      .map(match => amountNumber(match[0]))
      .filter(value => Number.isFinite(value) && value >= 100 && value <= 100000000);
    for (const value of values) {
      candidates.push({ value, score: (isTotal ? 150 : 0) - (excluded ? 160 : 0) + (i / Math.max(lines.length, 1)) });
    }
    // OCR puede separar TOTAL y el importe en dos líneas.
    if (isTotal && !excluded && values.length === 0 && lines[i + 1]) {
      const nextValues = [...lines[i + 1].matchAll(moneyRegex)].map(m => amountNumber(m[0]));
      for (const value of nextValues) {
        if (Number.isFinite(value) && value >= 100 && value <= 100000000) candidates.push({ value, score: 125 });
      }
    }
  });
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);

  // Priorizar nombres de establecimientos y evitar direcciones o datos fiscales.
  const simplify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const known: { pattern: RegExp; name: string }[] = [
    { pattern: /\bEXITO\b|\bEX1TO\b|\bXITO\b/, name: 'Éxito' },
    { pattern: /\bD1\b|\bTIENDAS? D1\b/, name: 'D1' },
    { pattern: /\bARA\b|\bJERONIMO MARTINS\b/, name: 'Ara' },
    { pattern: /\bOLIMPICA\b/, name: 'Olímpica' },
    { pattern: /\bJUMBO\b/, name: 'Jumbo' },
    { pattern: /\bCARULLA\b/, name: 'Carulla' },
    { pattern: /\bALKOSTO\b/, name: 'Alkosto' },
    { pattern: /\bDOLLARCITY\b|\bDOLLAR CITY\b/, name: 'Dollarcity' },
    { pattern: /\bOXXO\b/, name: 'OXXO' },
    { pattern: /\bFALABELLA\b/, name: 'Falabella' },
    { pattern: /\bMCDONALD\b/, name: "McDonald's" },
    { pattern: /\bSTARBUCKS\b/, name: 'Starbucks' },
    { pattern: /\bFRISBY\b/, name: 'Frisby' },
    { pattern: /\bKOKORIKO\b/, name: 'Kokoriko' },
  ];
  const header = lines.slice(0, Math.min(lines.length, 14));
  let establishment = '';
  for (const line of header) {
    const clean = simplify(line);
    const found = known.find(x => x.pattern.test(clean));
    if (found) { establishment = found.name; break; }
  }
  if (!establishment) {
    const ignored = /\b(NIT|RUT|FACTURA|FECHA|HORA|TELEFONO|DIRECCION|CAJA|CLIENTE|VENTA|RECIBO|DOCUMENTO|TIQUETE|TICKET|AUTORIZACION|RESOLUCION|CARRERA|CALLE|CRA|CLL|TOTAL|SUBTOTAL|GRACIAS|PAGO|IVA|REGIMEN|CODIGO|WWW|HTTP|PRODUCTO|ARTICULO|CANTIDAD|PRECIO|CAMBIO|EFECTIVO|TARJETA|CELULAR|PEDIDO|DOMICILIO|CAJERO|TRANSACCION|NUMERO|NRO|COP|PESOS)\b/;
    const candidates = header.map((line, i) => {
      const clean = simplify(line);
      const letters = (clean.match(/[A-Z]/g) || []).length;
      const digits = (clean.match(/[0-9]/g) || []).length;
      const isUpper = line === line.toUpperCase();
      const score = (isUpper ? 2 : 0) + Math.min(letters / 6, 4) - i * 0.8 - digits * 1.5;
      return { line: line.replace(/^[^\p{L}]+/u, '').trim(), clean, score, letters, digits };
    }).filter(x => x.letters >= 3 && x.letters <= 55 && x.digits <= 2 && !ignored.test(x.clean) && !/[\$@]|\d{2}[:\/\-]\d{2}/.test(x.line));
    candidates.sort((a, b) => b.score - a.score);
    establishment = candidates[0]?.line.replace(/\s{2,}/g, ' ').slice(0, 70) || '';
  }

  const dateMatches = text.match(/\b(?:\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})\b/g) || [];
  const date = dateMatches.map(normalizeDate).find(Boolean) || '';
  return { establishment, amount: candidates.length ? String(candidates[0].value) : '', date };
}

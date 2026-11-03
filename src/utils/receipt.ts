export type ReceiptData = { establishment: string; amount: string; date: string };

export function parseReceipt(text: string): ReceiptData {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const clean = (s: string) => s.replace(/[^\d.,]/g, '');
  const numberValue = (raw: string): number => {
    let s = clean(raw);
    if (!s) return NaN;
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    const last = Math.max(lastComma, lastDot);
    if (last >= 0) {
      const decimals = s.length - last - 1;
      if (decimals === 2) s = s.slice(0, last).replace(/[.,]/g, '') + '.' + s.slice(last + 1);
      else s = s.replace(/[.,]/g, '');
    }
    return Number(s);
  };
  const moneyPattern = /(?:\$\s*)?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\$\s*\d+(?:[.,]\d{2})?|\d{4,}(?:[.,]\d{2})?/g;
  const candidates: {value:number;score:number}[] = [];
  lines.forEach((line, i) => {
    const normalized = line.toUpperCase();
    const total = /\b(TOTAL\s*(A\s*PAGAR|PAGADO|VENTA)?|VALOR\s*(TOTAL|A\s*PAGAR)|NETO\s*A\s*PAGAR)\b/.test(normalized);
    const excluded = /SUBTOTAL|SUB\s*TOTAL|IVA|IMPUESTO|CAMBIO|DEVOLUCI|DESCUENTO|AHORRO|NIT|TEL|FACTURA|REFERENCIA/.test(normalized);
    for (const match of line.matchAll(moneyPattern)) {
      const value = numberValue(match[0]);
      if (Number.isFinite(value) && value > 0) candidates.push({value, score: (total ? 100 : 0) - (excluded ? 90 : 0) + i / Math.max(lines.length, 1)});
    }
  });
  candidates.sort((a,b) => b.score - a.score || b.value - a.value);
  const establishment = lines.slice(0, 8).find(line =>
    /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(line) &&
    !/^(NIT|FACTURA|FECHA|HORA|TEL|DIRECCI|CAJA|CLIENTE|VENTA|RECIBO|DOCUMENTO|RUT)/i.test(line) &&
    !/^\d/.test(line)
  ) || '';
  const dateMatch = text.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
  return { establishment, amount: candidates.length ? String(candidates[0].value) : '', date: dateMatch?.[0] || '' };
}

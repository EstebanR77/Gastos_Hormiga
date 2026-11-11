import AsyncStorage from '@react-native-async-storage/async-storage';

export type Expense = { id: string; tienda: string; valor: number; fecha: string; foto?: string };
const KEY = 'misGastos';
export async function getExpenses(): Promise<Expense[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is Expense => !!x && typeof x === 'object' && typeof x.tienda === 'string' && typeof x.valor === 'number').map((x, i) => ({ ...x, id: x.id || `legacy-${i}` }));
}
export async function addExpense(expense: Expense) {
  const items = await getExpenses();
  await AsyncStorage.setItem(KEY, JSON.stringify([expense, ...items]));
}
export async function removeExpense(id: string) {
  const items = await getExpenses();
  await AsyncStorage.setItem(KEY, JSON.stringify(items.filter(x => x.id !== id)));
}
export const money = (value: number) => '$ ' + Math.round(value).toLocaleString('es-CO');

import AsyncStorage from '@react-native-async-storage/async-storage';
export type Expense = {id:string;tienda:string;valor:number;fecha:string;foto?:string;categoria?:string;descripcion?:string};
export type Category = {id:string;nombre:string;emoji:string;color:string};
export type Goal = {categoria:string;limite:number};
export const DEFAULT_CATEGORIES:Category[]=[
{id:'alimentacion',nombre:'Alimentación',emoji:'🍔',color:'#F6A15D'},
{id:'transporte',nombre:'Transporte',emoji:'🚌',color:'#E6BD60'},
{id:'diversion',nombre:'Diversión',emoji:'🎬',color:'#E87558'},
{id:'compras',nombre:'Compras',emoji:'🛍️',color:'#B48391'},
{id:'otros',nombre:'Otros',emoji:'📦',color:'#A78165'}];
const EXPENSES='misGastos';const CATEGORIES='gh_categories_v1';const GOALS='gh_goals_v1';
export const money=(n:number)=>'$'+Math.round(n).toLocaleString('es-CO');
export async function getExpenses():Promise<Expense[]>{try{const data=JSON.parse((await AsyncStorage.getItem(EXPENSES))||'[]');return Array.isArray(data)?data.filter(x=>x&&typeof x.tienda==='string'&&Number.isFinite(Number(x.valor))).map((x,i)=>({...x,valor:Number(x.valor),id:x.id||`legacy-${i}`,categoria:x.categoria||'otros',descripcion:x.descripcion||''})):[]}catch{return []}}
export async function addExpense(x:Expense){const a=await getExpenses();await AsyncStorage.setItem(EXPENSES,JSON.stringify([x,...a]))}
export async function removeExpense(id:string){await AsyncStorage.setItem(EXPENSES,JSON.stringify((await getExpenses()).filter(x=>x.id!==id)))}
export async function getCategories():Promise<Category[]>{try{const x=JSON.parse((await AsyncStorage.getItem(CATEGORIES))||'null');return Array.isArray(x)?x:DEFAULT_CATEGORIES}catch{return DEFAULT_CATEGORIES}}
export async function addCategory(c:Category){const a=await getCategories();await AsyncStorage.setItem(CATEGORIES,JSON.stringify([...a,c]))}
export async function getGoals():Promise<Goal[]>{try{const x=JSON.parse((await AsyncStorage.getItem(GOALS))||'[]');return Array.isArray(x)?x:[]}catch{return []}}
export async function saveGoal(goal:Goal){const a=(await getGoals()).filter(x=>x.categoria!==goal.categoria);await AsyncStorage.setItem(GOALS,JSON.stringify([...a,goal]))}

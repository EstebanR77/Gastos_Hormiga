
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readReceiptOnline } from './src/utils/ocr';
import { parseReceipt } from './src/utils/receipt';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addExpense,
  getExpenses,
  money,
  removeExpense,
  type Expense,
} from './src/utils/storage';

const hoy = () => new Date().toLocaleDateString('es-CO');

function convertirValor(texto: string) {
  const limpio = texto.replace(/[^\d,.]/g, '');
  if (!limpio) return NaN;

  const posicion = Math.max(
    limpio.lastIndexOf('.'),
    limpio.lastIndexOf(',')
  );

  const normalizado =
    posicion >= 0 && limpio.length - posicion - 1 === 2
      ? limpio.slice(0, posicion).replace(/[.,]/g, '') +
        '.' +
        limpio.slice(posicion + 1)
      : limpio.replace(/[.,]/g, '');

  return Number(normalizado);
}

export default function App() {
  const [tab, setTab] = useState<'registro' | 'historial'>(
    'registro'
  );
  const [foto, setFoto] = useState('');
  const [tienda, setTienda] = useState('');
  const [valor, setValor] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [ocrKey, setOcrKey] = useState('');
  const [configurando, setConfigurando] = useState(false);
  const [gastos, setGastos] = useState<Expense[]>([]);

  async function actualizar() {
    try {
      const datos = await getExpenses();
      setGastos(datos);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el historial.');
    }
  }

  useEffect(() => {
    void actualizar();
    AsyncStorage.getItem('ocr_api_key').then(key => { if (key) setOcrKey(key); }).catch(() => {});
  }, []);

  async function guardarClave() {
    try {
      await AsyncStorage.setItem('ocr_api_key', ocrKey.trim());
      setConfigurando(false);
      Alert.alert('Configuración', 'Clave OCR guardada.');
    } catch { Alert.alert('Error', 'No se pudo guardar la clave.'); }
  }

  async function seleccionar(camara: boolean) {
    try {
      if (camara) {
        const permiso =
          await ImagePicker.requestCameraPermissionsAsync();

        if (!permiso.granted) {
          Alert.alert(
            'Permiso necesario',
            'Autoriza el acceso a la cámara.'
          );
          return;
        }
      }

      const resultado = camara
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });

      if (
        resultado.canceled ||
        !resultado.assets?.[0]?.uri
      ) {
        return;
      }

      const uri = resultado.assets[0].uri;
      setFoto(uri);
      setTienda('');
      setValor('');
      setFecha(hoy());
      setLeyendo(true);
      setMensaje('Leyendo recibo con OCR en línea...');
      try {
        const texto = await readReceiptOnline(uri, ocrKey.trim());
        const datos = parseReceipt(texto);
        setTienda(datos.establishment);
        setValor(datos.amount);
        setFecha(datos.date || hoy());
        setMensaje('Lectura finalizada. Revisa los datos antes de guardar.');
      } catch (error) {
        const detalle = error instanceof Error ? error.message : 'Error desconocido';
        setMensaje('No se pudo leer el recibo: ' + detalle + '. Puedes completar los datos manualmente.');
      } finally {
        setLeyendo(false);
      }
    } catch {
      Alert.alert(
        'Error',
        'No se pudo abrir la cámara o la galería.'
      );
    }
  }

  async function guardar() {
    const numero = convertirValor(valor);

    if (
      !tienda.trim() ||
      !Number.isFinite(numero) ||
      numero <= 0
    ) {
      Alert.alert(
        'Datos incompletos',
        'Ingresa el establecimiento y un valor válido.'
      );
      return;
    }

    if (!fecha.trim()) {
      Alert.alert(
        'Datos incompletos',
        'Ingresa la fecha.'
      );
      return;
    }

    if (guardando) return;

    setGuardando(true);

    try {
      await addExpense({
        id:
          Date.now().toString() +
          Math.random().toString(36).slice(2),
        tienda: tienda.trim(),
        valor: numero,
        fecha: fecha.trim(),
        foto,
      });

      setFoto('');
      setTienda('');
      setValor('');
      setFecha(hoy());
      setMensaje('');

      await actualizar();
      setTab('historial');

      Alert.alert(
        'Guardado',
        'El gasto se registró correctamente.'
      );
    } catch {
      Alert.alert(
        'Error',
        'No se pudo guardar el gasto.'
      );
    } finally {
      setGuardando(false);
    }
  }

  function eliminar(id: string) {
    Alert.alert(
      'Eliminar gasto',
      '¿Quieres eliminar este registro?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExpense(id);
              await actualizar();
            } catch {
              Alert.alert(
                'Error',
                'No se pudo eliminar el gasto.'
              );
            }
          },
        },
      ]
    );
  }

  const total = gastos.reduce(
    (acumulado, gasto) => acumulado + gasto.valor,
    0
  );

  return (
    <View style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F4F7FA"
      />

      <View style={styles.header}>
        <Text style={styles.heading}>Gastos Hormiga</Text>
        <Text style={styles.subheading}>
          Controla tus pequeños gastos
        </Text>
      </View>

      <Pressable onPress={() => setConfigurando(!configurando)} style={styles.configButton}>
        <Text style={styles.configText}>Configurar OCR {configurando ? '▲' : '▼'}</Text>
      </Pressable>
      {configurando ? <View style={styles.configPanel}>
        <Text>Clave gratuita de OCR.space (API key)</Text>
        <TextInput style={styles.input} value={ocrKey} onChangeText={setOcrKey} placeholder="Pega aquí tu clave OCR.space" autoCapitalize="none" />
        <Pressable style={styles.action} onPress={() => void guardarClave()}><Text style={styles.actionText}>Guardar clave</Text></Pressable>
        <Text style={styles.configHelp}>Para probar se usa la clave de demostración cuando el campo está vacío. Tiene límites y puede no funcionar; consigue tu propia clave en ocr.space/ocrapi.</Text>
      </View> : null}
      <View style={styles.tabs}>
        <Pressable
          style={[
            styles.tab,
            tab === 'registro' && styles.tabActive,
          ]}
          onPress={() => setTab('registro')}
        >
          <Text style={styles.tabText}>
            Registrar gasto
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            tab === 'historial' && styles.tabActive,
          ]}
          onPress={() => {
            setTab('historial');
            void actualizar();
          }}
        >
          <Text style={styles.tabText}>Mis gastos</Text>
        </Pressable>
      </View>

      {tab === 'registro' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === 'ios' ? 'padding' : undefined
          }
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <Text style={styles.section}>
              Foto del recibo
            </Text>

            <View style={styles.actions}>
              <Pressable
                style={styles.action}
                onPress={() => void seleccionar(true)}
                disabled={leyendo}
              >
                <Text style={styles.actionText}>
                  Tomar foto
                </Text>
              </Pressable>

              <Pressable
                style={styles.action}
                onPress={() => void seleccionar(false)}
                disabled={leyendo}
              >
                <Text style={styles.actionText}>
                  Galería
                </Text>
              </Pressable>
            </View>

            {foto ? (
              <Image
                source={{ uri: foto }}
                style={styles.photo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  Selecciona un recibo para comenzar
                </Text>
              </View>
            )}

            {leyendo ? <Text style={styles.notice}>Reconociendo texto, espera...</Text> : null}
            {mensaje ? (
              <Text style={styles.notice}>
                {mensaje}
              </Text>
            ) : null}

            <Text style={styles.section}>
              Datos del gasto
            </Text>

            <Text style={styles.label}>
              Establecimiento
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Tienda Éxito"
              value={tienda}
              onChangeText={setTienda}
            />

            <Text style={styles.label}>
              Valor (pesos colombianos)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 12500"
              keyboardType="decimal-pad"
              value={valor}
              onChangeText={setValor}
            />

            <Text style={styles.label}>Fecha</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              value={fecha}
              onChangeText={setFecha}
            />

            <Pressable
              style={[
                styles.save,
                (guardando || leyendo) && styles.disabled,
              ]}
              onPress={() => void guardar()}
              disabled={guardando || leyendo}
            >
              <Text style={styles.saveText}>
                {guardando
                  ? 'Guardando...'
                  : 'Guardar gasto'}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
        >
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>
              Total registrado
            </Text>
            <Text style={styles.summaryValue}>
              {money(total)}
            </Text>
            <Text style={styles.summaryLabel}>
              {gastos.length} gastos guardados
            </Text>
          </View>

          {gastos.length === 0 ? (
            <Text style={styles.empty}>
              Aún no tienes gastos registrados.
            </Text>
          ) : (
            gastos.map((gasto) => (
              <View
                style={styles.item}
                key={gasto.id}
              >
                {gasto.foto ? (
                  <Image
                    source={{ uri: gasto.foto }}
                    style={styles.thumbnail}
                  />
                ) : null}

                <View style={{ flex: 1 }}>
                  <Text style={styles.shop}>
                    {gasto.tienda}
                  </Text>
                  <Text style={styles.itemValue}>
                    {money(gasto.valor)}
                  </Text>
                  <Text style={styles.itemDate}>
                    {gasto.fecha}
                  </Text>
                </View>

                <Pressable
                  onPress={() => eliminar(gasto.id)}
                >
                  <Text style={styles.delete}>
                    Eliminar
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  configButton: { marginHorizontal: 20, marginBottom: 10, alignSelf: 'flex-start' },
  configText: { color: '#1769AA', fontWeight: '700' },
  configPanel: { marginHorizontal: 20, marginBottom: 14, gap: 8 },
  configHelp: { fontSize: 12, color: '#667A8B' },
  safe: {
    flex: 1,
    backgroundColor: '#F4F7FA',
    paddingTop:
      Platform.OS === 'android' ? 35 : 45,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#17334F',
  },
  subheading: {
    color: '#667A8B',
    marginTop: 3,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#E6EDF3',
    borderRadius: 12,
    padding: 4,
    marginBottom: 6,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    color: '#587087',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17334F',
    marginBottom: 13,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
    backgroundColor: '#1769AA',
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  photo: {
    height: 215,
    width: '100%',
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    height: 125,
    borderWidth: 1,
    borderColor: '#CAD7E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#778899',
    textAlign: 'center',
  },
  notice: {
    backgroundColor: '#E7F1FC',
    color: '#285B80',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  label: {
    fontWeight: '600',
    color: '#30465B',
    marginTop: 9,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CDD9E4',
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    color: '#1A2E40',
  },
  save: {
    marginTop: 24,
    backgroundColor: '#17784E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  summary: {
    backgroundColor: '#E5F1FB',
    padding: 22,
    borderRadius: 15,
    marginBottom: 18,
  },
  summaryLabel: {
    color: '#4D6B84',
  },
  summaryValue: {
    fontSize: 27,
    fontWeight: '800',
    color: '#164F7E',
    marginVertical: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#6E8090',
    marginTop: 35,
  },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 55,
    height: 65,
    borderRadius: 6,
  },
  shop: {
    fontWeight: '700',
    color: '#20374D',
    fontSize: 16,
  },
  itemValue: {
    fontWeight: '700',
    color: '#1465A4',
    marginTop: 4,
  },
  itemDate: {
    color: '#718394',
    marginTop: 3,
  },
  delete: {
    color: '#B13B3B',
    fontWeight: '600',
    fontSize: 12,
  },
});

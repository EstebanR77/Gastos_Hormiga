
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addExpense } from '../utils/storage';

export default function Inicio() {
  const [foto, setFoto] = useState('');
  const [tienda, setTienda] = useState('');
  const [valor, setValor] = useState('');
  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');

  function procesarImagen(uri: string) {
    setFoto(uri);
    setTienda('');
    setValor('');
    setFecha(new Date().toLocaleDateString('es-CO'));
    setAviso(
      'Imagen seleccionada. Ingresa los datos del recibo para guardar el gasto.'
    );
  }

  async function tomarFoto() {
    try {
      const permiso =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          'Permiso necesario',
          'Debes permitir el acceso a la cámara.'
        );
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        quality: 0.85,
      });

      if (!resultado.canceled && resultado.assets[0]?.uri) {
        procesarImagen(resultado.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  }

  async function elegirFoto() {
    try {
      const resultado =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
        });

      if (!resultado.canceled && resultado.assets[0]?.uri) {
        procesarImagen(resultado.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  }

  async function guardar() {
    const limpio = valor
      .trim()
      .replace(/\s/g, '')
      .replace(/\$/g, '');

    const numero = Number(
      limpio.replace(/\./g, '').replace(',', '.')
    );

    if (
      !tienda.trim() ||
      !Number.isFinite(numero) ||
      numero <= 0
    ) {
      Alert.alert(
        'Datos incompletos',
        'Escribe el establecimiento y un valor válido.'
      );
      return;
    }

    if (guardando) return;

    setGuardando(true);

    try {
      await addExpense({
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        tienda: tienda.trim(),
        valor: numero,
        fecha:
          fecha.trim() ||
          new Date().toLocaleDateString('es-CO'),
        foto,
      });

      setFoto('');
      setTienda('');
      setValor('');
      setFecha('');

      setAviso(
        'Gasto guardado correctamente. Puedes verlo en Mis gastos.'
      );

      if (Platform.OS !== 'web') {
        Alert.alert(
          'Guardado',
          'El gasto se guardó correctamente.'
        );
      }
    } catch {
      Alert.alert(
        'Error',
        'No fue posible guardar el gasto.'
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Gastos Hormiga</Text>

      <Text style={styles.subtitle}>
        Registra tus compras a partir de una foto del recibo.
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={tomarFoto}>
          <Text style={styles.buttonText}>Tomar foto</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={elegirFoto}>
          <Text style={styles.buttonText}>
            Elegir de galería
          </Text>
        </Pressable>
      </View>

      {foto ? (
        <Image
          source={{ uri: foto }}
          style={styles.photo}
          resizeMode="contain"
        />
      ) : null}

      {aviso ? (
        <Text style={styles.notice}>{aviso}</Text>
      ) : null}

      <Text style={styles.label}>Establecimiento</Text>

      <TextInput
        style={styles.input}
        value={tienda}
        onChangeText={setTienda}
        placeholder="Nombre del comercio"
      />

      <Text style={styles.label}>Valor total (COP)</Text>

      <TextInput
        style={styles.input}
        value={valor}
        onChangeText={setValor}
        keyboardType="decimal-pad"
        placeholder="Ej. 12500"
      />

      <Text style={styles.label}>Fecha</Text>

      <TextInput
        style={styles.input}
        value={fecha}
        onChangeText={setFecha}
        placeholder="DD/MM/AAAA"
      />

      <Pressable
        style={[
          styles.button,
          guardando && styles.disabled,
        ]}
        onPress={guardar}
        disabled={guardando}
      >
        <Text style={styles.buttonText}>
          {guardando ? 'Guardando...' : 'Guardar gasto'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 65,
    gap: 11,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#172C49',
  },
  subtitle: {
    color: '#54657C',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: '#1865B3',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  photo: {
    width: '100%',
    height: 220,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  notice: {
    backgroundColor: '#E7F1FC',
    color: '#234E78',
    padding: 12,
    borderRadius: 8,
  },
  label: {
    color: '#26364C',
    fontWeight: '600',
    marginTop: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#C9D5E2',
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    color: '#162A43',
  },
  disabled: {
    opacity: 0.5,
  },
});

import { useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseReceipt } from '../utils/receipt';

export default function Inicio() {
  const [foto, setFoto] = useState('');
  const [tienda, setTienda] = useState('');
  const [valor, setValor] = useState('');
  const [fecha, setFecha] = useState('');
  const [leyendo, setLeyendo] = useState(false);

  async function tomarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso', 'Debes permitir el uso de la cámara');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (resultado.canceled) return;
    const imagen = resultado.assets[0].uri;
    setFoto(imagen);
    setTienda(''); setValor(''); setFecha('');
    setLeyendo(true);
    try {
      // Esta librería necesita una compilación de desarrollo, no Expo Go.
      const { extractTextFromImage } = require('expo-text-extractor');
      const lineas = await extractTextFromImage(imagen);
      const texto = Array.isArray(lineas) ? lineas.join('\n') : String(lineas || '');
      const datos = parseReceipt(texto);
      setTienda(datos.establishment);
      setValor(datos.amount);
      setFecha(datos.date);
      if (!texto.trim()) Alert.alert('Aviso', 'No se pudo leer el recibo. Escribe los datos.');
    } catch {
      Alert.alert('OCR no disponible', 'Instala las dependencias y usa una compilación de desarrollo. Puedes escribir los datos manualmente.');
    } finally {
      setLeyendo(false);
    }
  }

  async function guardar() {
    const numero = Number(valor.trim().replace(/\./g, '').replace(',', '.'));
    if (!tienda.trim() || !Number.isFinite(numero) || numero <= 0) {
      Alert.alert('Faltan datos', 'Escribe el establecimiento y el valor');
      return;
    }
    try {
      const anterior = await AsyncStorage.getItem('misGastos');
      const gastos = anterior ? JSON.parse(anterior) : [];
      gastos.push({ tienda: tienda.trim(), valor: numero, fecha: fecha.trim(), foto });
      await AsyncStorage.setItem('misGastos', JSON.stringify(gastos));
      Alert.alert('Listo', 'Gasto guardado en el celular');
      setFoto(''); setTienda(''); setValor(''); setFecha('');
    } catch {
      Alert.alert('Error', 'No se pudo guardar');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <Text style={styles.titulo}>Registro de gastos</Text>
      <Button title="Tomar foto" onPress={tomarFoto} disabled={leyendo} />
      {foto ? <Image source={{ uri: foto }} style={styles.foto} /> : null}
      {leyendo ? <Text>Leyendo recibo...</Text> : null}
      <Text>Establecimiento:</Text>
      <TextInput style={styles.campo} value={tienda} onChangeText={setTienda} placeholder="Nombre de la tienda" />
      <Text>Valor:</Text>
      <TextInput style={styles.campo} value={valor} onChangeText={setValor} keyboardType="numeric" placeholder="Valor total" />
      <Text>Fecha:</Text>
      <TextInput style={styles.campo} value={fecha} onChangeText={setFecha} placeholder="DD/MM/AAAA" />
      <Button title="Guardar" onPress={guardar} disabled={leyendo} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { padding: 20, paddingTop: 45, gap: 12, backgroundColor: 'white', flexGrow: 1 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  campo: { borderWidth: 1, borderColor: 'gray', padding: 8 },
  foto: { width: '100%', height: 160, resizeMode: 'contain' },
});


import * as FileSystem from 'expo-file-system/legacy';

export async function readReceiptOnline(
  uri: string,
  apiKey: string
): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const extension = uri.toLowerCase().split('?')[0];
    const tipo = extension.endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';

    const imagen = `data:${tipo};base64,${base64}`;

    const parametros = new URLSearchParams();
    parametros.append('base64Image', imagen);
    parametros.append('language', 'spa');
    parametros.append('isOverlayRequired', 'false');
    parametros.append('OCREngine', '2');
    parametros.append('scale', 'true');

    const response = await fetch(
      'https://api.ocr.space/parse/image',
      {
        method: 'POST',
        headers: {
          apikey: apiKey || 'helloworld',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: parametros.toString(),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Error del servicio OCR: ${response.status}`
      );
    }

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      const error = data.ErrorMessage;
      throw new Error(
        Array.isArray(error)
          ? error.join(' ')
          : String(error || 'No se pudo leer el recibo')
      );
    }

    const texto = (data.ParsedResults || [])
      .map((resultado: { ParsedText?: string }) =>
        resultado.ParsedText || ''
      )
      .join('\n')
      .trim();

    if (!texto) {
      throw new Error(
        'No se encontró texto en el recibo.'
      );
    }

    return texto;
  } catch (error) {
    console.error('Error OCR:', error);
    throw error;
  }
}

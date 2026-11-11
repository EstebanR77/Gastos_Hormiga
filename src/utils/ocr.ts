// OCR en línea: funciona en Expo Go, pero necesita Internet y un servicio externo.
// La clave "helloworld" es solo para pruebas y tiene límites.
export async function readReceiptOnline(uri: string, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append('language', 'spa');
  form.append('isOverlayRequired', 'false');
  form.append('OCREngine', '2');
  form.append('file', { uri, type: 'image/jpeg', name: 'recibo.jpg' } as any);
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { apikey: apiKey || 'helloworld' },
    body: form,
  });
  if (!response.ok) throw new Error('Servicio OCR no disponible (HTTP ' + response.status + ')');
  const data = await response.json();
  if (data.IsErroredOnProcessing) {
    const err = data.ErrorMessage;
    throw new Error(Array.isArray(err) ? err.join(' ') : String(err || 'El OCR rechazó la imagen'));
  }
  const text = (data.ParsedResults || []).map((x: { ParsedText?: string }) => x.ParsedText || '').join('\n').trim();
  if (!text) throw new Error('No se reconoció texto en la imagen');
  return text;
}

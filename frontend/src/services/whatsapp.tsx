import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';

export async function sharePdf(uri: string) {
  const isPdfFile = String(uri || '').toLowerCase().endsWith('.pdf');

  if (isPdfFile && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar PDF Bymen',
    });
    return;
  }

  await Share.share({
    url: uri,
    message: 'Relatório de medição Bymen',
    title: 'Medição Bymen',
  });
}

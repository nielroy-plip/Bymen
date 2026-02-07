import { Share, Platform } from 'react-native';

export async function sharePdf(uri: string) {
  const url = Platform.OS === 'android' ? uri : uri;
  await Share.share({
    url,
    message: 'Relatório de medição Bymen',
    title: 'Medição Bymen'
  });
}

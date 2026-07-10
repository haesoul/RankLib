import * as FileSystem from 'expo-file-system';

export const saveFileToPermanentStorage = async (
  uri: string | null, 
  subFolder: string = 'media'
): Promise<string> => {
  if (!uri) return '';

  const isNetwork = uri.startsWith('http://') || uri.startsWith('https://');
  if (!isNetwork) {
    return uri; 
  }

  try {
    const folderUri = `${FileSystem.documentDirectory}${subFolder}/`;
    const folderInfo = await FileSystem.getInfoAsync(folderUri);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
    }

    const urlClean = uri.split('?')[0]; 
    const extension = urlClean.split('.').pop() || 'jpg';
    const cleanExtension = extension.length <= 4 ? extension : 'jpg';
    
    const safeFileName = `${encodeURIComponent(urlClean.slice(-30))}_${Date.now()}.${cleanExtension}`;
    const permanentTargetUri = `${folderUri}${safeFileName}`;

    const downloadResult = await FileSystem.downloadAsync(uri, permanentTargetUri);
    
    return downloadResult.uri; 
  } catch (error) {
    console.error('Ошибка при долгосрочном сохранении файла:', error);
    return uri; 
  }
};
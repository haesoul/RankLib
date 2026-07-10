import { saveFileToPermanentStorage } from '@/utils/installFiles';
import React from 'react';
import { Image, ImageProps, ImageSourcePropType } from 'react-native';


interface SmartImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  source?: ImageSourcePropType;
  fallbackUri?: string;
}

const DEFAULT_FALLBACK = 'https://picsum.photos/200';

export const SmartImage: React.FC<SmartImageProps> = ({
  uri,
  source,
  fallbackUri = DEFAULT_FALLBACK,
  style,
  ...props
}) => {
  
  const photo = uri && saveFileToPermanentStorage(uri)
  const resolveSource = (): ImageSourcePropType => {
    if (source) {
      return source;
    }
    if (!uri) {
      return { uri: fallbackUri };
    }

    const isNetwork = uri.startsWith('http://') || uri.startsWith('https://');

    if (isNetwork) {
      return { uri: `${uri}?v=${Date.now()}` };
    }

    return { uri };
  };

  return (
    <Image
      source={resolveSource()}
      style={style}
      {...props} 
    />
  );
};
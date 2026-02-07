import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export function useResponsive() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const isTablet = dimensions.width >= 768;
  const isLandscape = dimensions.width > dimensions.height;

  return {
    width: dimensions.width,
    height: dimensions.height,
    isTablet,
    isLandscape,
    isMobile: !isTablet,
    padding: isTablet ? 48 : 24,
    fontSize: {
      small: isTablet ? 14 : 12,
      base: isTablet ? 18 : 16,
      large: isTablet ? 24 : 20,
      xlarge: isTablet ? 32 : 24
    },
    inputHeight: isTablet ? 56 : 48,
    buttonHeight: isTablet ? 56 : 48,
    cardGap: isTablet ? 24 : 12,
    columns: isTablet && isLandscape ? 2 : 1
  };
}

import React, { useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableWithoutFeedback,
  UIManager,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  label?: string;
  error?: string | boolean;
  autoGrowMaxHeight?: number;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export const Input: React.FC<InputProps> = ({
  containerStyle,
  inputStyle,
  label,
  error,
  onFocus,
  onBlur,
  onContentSizeChange: onContentSizeChangeProp,
  multiline,
  autoGrowMaxHeight,
  ...rest
}) => {
  const focused = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const { width: screenWidth } = useWindowDimensions();

  const handleFocus = (e: any) => {
    Animated.timing(focused, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false, 
    }).start();
    onFocus && onFocus(e);
  };

  const handleBlur = (e: any) => {
    Animated.timing(focused, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur && onBlur(e);
  };

  const SINGLE_LINE_HEIGHT = Platform.OS === 'ios' ? 44 : 48;
  const MAX_LINES = 3;
  const CONTAINER_MARGIN = 5; // margin из стилей container
  const HORIZONTAL_PADDING = 12; // paddingHorizontal из стилей box
  
  // Правильный расчет ширины с учетом margin и padding
  // Контейнер: 100% - (margin-left + margin-right) = 100% - 10
  // Box внутри контейнера: ширина контейнера - (padding-left + padding-right) = width - 24
  const CONTAINER_WIDTH = screenWidth - (CONTAINER_MARGIN * 2);
  const INPUT_WIDTH = CONTAINER_WIDTH - (HORIZONTAL_PADDING * 2);

  const borderColor = focused.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2b2b2b', '#4e9cff'],
  });

  const shadowOpacity = focused.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  const elevation = focused.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  const MIN_HEIGHT = Platform.OS === 'ios' ? 40 : 42;
  const [contentHeight, setContentHeight] = useState<number>(MIN_HEIGHT);
  const [scrollEnabled, setScrollEnabled] = useState(false);

  const handleContentSizeChange = (e: any) => {
    if (!multiline) {
      onContentSizeChangeProp && onContentSizeChangeProp(e);
      return;
    }

    const nativeHeight = e.nativeEvent.contentSize.height;

    // Вычисляем максимальную высоту (MAX_LINES * SINGLE_LINE_HEIGHT)
    const LIMIT = autoGrowMaxHeight || (SINGLE_LINE_HEIGHT * MAX_LINES);
    
    // Реальная высота контента
    const newHeight = Math.max(SINGLE_LINE_HEIGHT, nativeHeight);
    
    // Ограничиваем высоту лимитом
    const limitedHeight = Math.min(newHeight, LIMIT);
    
    // Включаем скролл если контент больше лимита
    const shouldScroll = newHeight > LIMIT;

    if (contentHeight !== limitedHeight) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setContentHeight(limitedHeight);
    }
    
    if (scrollEnabled !== shouldScroll) {
      setScrollEnabled(shouldScroll);
    }

    onContentSizeChangeProp && onContentSizeChangeProp(e);
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableWithoutFeedback onPress={handleContainerPress}>
        <AnimatedView
          style={[
            styles.box,
            {
              borderColor,
              shadowOpacity,
              
              elevation,
              paddingVertical: multiline ? 0 : (Platform.OS === 'ios' ? 12 : 8),
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            {...rest}
            multiline={multiline ?? false}
            placeholderTextColor="#7a7a7a"
            onFocus={handleFocus}
            onBlur={handleBlur}
            onContentSizeChange={handleContentSizeChange}
            scrollEnabled={scrollEnabled}
            
            style={[
              styles.input,
              inputStyle,
              { width: '100%' },
              multiline
                ? {
                    height: contentHeight,
                    textAlignVertical: 'top',
                    paddingVertical: 10,
                  }
                : {                },
            ]}
          />
        </AnimatedView>
      </TouchableWithoutFeedback>

      {error ? (
        <Text style={styles.error}>
          {typeof error === 'string' ? error : 'Ошибка'}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 5,
  },
  label: {
    color: '#cfcfcf',
    marginBottom: 6,
    fontSize: 13,
    marginLeft: 4,
  },
  box: {
    backgroundColor: '#0f0f10',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    shadowColor: '#4e9cff',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  input: {
    color: '#fff',
    fontSize: 16,
    padding: 0,
    margin: 0,
    minHeight: Platform.OS === 'ios' ? 24 : 28,
  },
  error: {
    color: '#ff6b6b',
    marginTop: 6,
    fontSize: 13,
    marginLeft: 4,
  },
});

export default Input;
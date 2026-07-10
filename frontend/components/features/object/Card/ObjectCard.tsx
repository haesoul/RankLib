import { Colors } from '@/CONSTANTS';
import React, { useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

const { width } = Dimensions.get("window");

type ObjectCardProps = {
  item: any;
  onPress: (item: any) => void;
  onLongPress: (item: any) => void;
  index: number;
  topNumber?: number;
  type?: 2 | 3;
  isSelected?: boolean;
};

const ObjectCard: React.FC<ObjectCardProps> = React.memo(({ item, onPress, onLongPress, index, topNumber, type = 2, isSelected = false }) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  const animatedIn = React.useRef(false);

  const screenPadding = type === 2 ? 18: 13.5;
  const gap = type === 2 ? 12: 5;
  const numColumns = type; 

  const CARD_WIDTH = (width - (screenPadding * 2) - (gap * (numColumns - 1))) / numColumns;


  useEffect(() => {
    if (animatedIn.current) {
      opacity.setValue(1);
      return;
    }

    animatedIn.current = true;
    
    const appearanceDelay = index < 20 ? Math.min(index * 50, 1000) : 0;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      delay: appearanceDelay,
      useNativeDriver: true,
    }).start();
  }, []);
  // useEffect(() => {
  //   Animated.timing(opacity, {
  //     toValue: 1,
  //     duration: 400,
  //     delay: Math.min(index * 100, 600),
  //     useNativeDriver: true,
  //   }).start();
  // }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
    const imageUri = item.photo
    ? `${item.photo}?v=${Date.now()}`
    : "https://placekitten.com/200/200";

  return (
    <Animated.View style={{ 
      opacity, 
      transform: [{ scale }],
      width: CARD_WIDTH,
      marginRight: gap,
      borderRadius: 12,
    }}>
      <Pressable
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress}
        style={[styles.card, {
          width: CARD_WIDTH, 
          marginBottom: type === 3 ? 5 : 15,
          aspectRatio: type === 3? 8 / 12 :6 / 8,
          borderWidth: isSelected ? 2 : 0, 
          borderColor: isSelected ? '#FFD700' : 'transparent',
        }
      ]}
      >
        <Image
          source={{ 
            uri: imageUri,
          }}
          fadeDuration={0}
          style={[styles.image, 
            {width: type === 2 ? '100%' : '110%'}
          ]}
          resizeMode="cover"
        />
        <Text numberOfLines={2} style={[styles.title, {fontSize: type === 2 ? 15 : 12}]}>
          {item.name}
        </Text>
        <View style={{flexDirection: "row"}}>
          {topNumber !== undefined && topNumber > 0 && topNumber < 11 && (
            <View style={[styles.ribbon, type === 3 && styles.ribbonType3]}>
              <Text style={[styles.ribbonText, {fontSize: type === 3 ? 10 : undefined}]}>{topNumber}</Text>
            </View>
          )}
          <Text style={[styles.rank, type === 3 && styles.rankType3]}>
            ⭐ {item.overall_rank?.toFixed(2) ?? "—"}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
    
  );
}, (prev, next) => {
  return prev.item._id.equals(next.item._id) && prev.isSelected === next.isSelected && prev.index === next.index;
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceDarker,
    borderRadius: 16,
    padding: 10,

    aspectRatio: 6 / 8,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  image: {
    width: '100%',

    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#222',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  rank: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    marginLeft: 10,
  },
  rankType3: {
    fontSize: 11,
    marginLeft: 5
  },

  ribbon: {
    position: 'relative',
    paddingVertical: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  ribbonType3: {
    width: 20,
    height: 20,
    borderRadius:6,

  },
  ribbonText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.6,
  },



});

export default ObjectCard;
import { StyleSheet, View, ViewStyle } from 'react-native';

interface LogoProps {
  size?: number;
  style?: ViewStyle;
}

export function Logo({ size = 80, style }: LogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Heart shape with brain and hand */}
      <View style={[styles.heart, { width: size * 0.8, height: size * 0.8 }]}>
        {/* Left side - Heart with hand */}
        <View style={[styles.heartLeft, { backgroundColor: '#E1BEE7' }]}>
          {/* Hand reaching up */}
          <View style={styles.hand}>
            <View style={styles.finger1} />
            <View style={styles.finger2} />
            <View style={styles.finger3} />
            <View style={styles.finger4} />
            <View style={styles.thumb} />
          </View>
        </View>
        
        {/* Right side - Brain */}
        <View style={[styles.heartRight, { backgroundColor: '#B3E5FC' }]}>
          {/* Brain folds */}
          <View style={styles.brainFold1} />
          <View style={styles.brainFold2} />
          <View style={styles.brainFold3} />
          <View style={styles.brainFold4} />
        </View>
        
        {/* Center line */}
        <View style={styles.centerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    position: 'relative',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
  },
  heartLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '50%',
    height: '100%',
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
  },
  heartRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '50%',
    height: '100%',
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#000',
    zIndex: 1,
  },
  hand: {
    position: 'absolute',
    bottom: 5,
    left: 10,
    width: 20,
    height: 25,
  },
  finger1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 3,
    height: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
  },
  finger2: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    width: 3,
    height: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
  },
  finger3: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    width: 3,
    height: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
  },
  finger4: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    width: 3,
    height: 13,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    bottom: 2,
    left: 16,
    width: 3,
    height: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  brainFold1: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 3,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
  },
  brainFold2: {
    position: 'absolute',
    top: 16,
    right: 12,
    width: 8,
    height: 3,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
  },
  brainFold3: {
    position: 'absolute',
    top: 24,
    right: 6,
    width: 10,
    height: 3,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
  },
  brainFold4: {
    position: 'absolute',
    top: 32,
    right: 10,
    width: 6,
    height: 3,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
  },
}); 
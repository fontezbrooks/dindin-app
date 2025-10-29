import { LinearGradient } from "expo-linear-gradient";
import type React from "react";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

export const RecipeCardSkeleton: React.FC = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, { opacity }]}>
        {/* Image skeleton */}
        <LinearGradient
          colors={["#E0E0E0", "#F5F5F5", "#E0E0E0"]}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={styles.imageSkeleton}
        />

        {/* Top badges skeleton */}
        <View style={styles.topInfo}>
          <View style={styles.badgeSkeleton} />
          <View style={[styles.badgeSkeleton, { width: 80 }]} />
        </View>

        {/* Bottom info skeleton */}
        <View style={styles.bottomInfo}>
          <View style={styles.titleSkeleton} />
          <View style={styles.descriptionSkeleton} />
          <View style={styles.descriptionSkeleton} />

          {/* Tags skeleton */}
          <View style={styles.tagRow}>
            <View style={styles.tagSkeleton} />
            <View style={styles.tagSkeleton} />
          </View>

          {/* Stats skeleton */}
          <View style={styles.statsRow}>
            <View style={styles.statSkeleton} />
            <View style={styles.statSkeleton} />
            <View style={styles.statSkeleton} />
            <View style={styles.statSkeleton} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  card: {
    flex: 1,
  },
  imageSkeleton: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  topInfo: {
    position: "absolute",
    top: 20,
    left: 20,
    flexDirection: "row",
    gap: 10,
  },
  badgeSkeleton: {
    width: 60,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 25,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  titleSkeleton: {
    width: "80%",
    height: 24,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 8,
  },
  descriptionSkeleton: {
    width: "100%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  tagSkeleton: {
    width: 70,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statSkeleton: {
    width: 50,
    height: 16,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
});

export default RecipeCardSkeleton;

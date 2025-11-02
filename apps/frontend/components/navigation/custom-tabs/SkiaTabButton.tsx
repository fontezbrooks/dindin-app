import { Ionicons } from "@expo/vector-icons";
import type { Ref } from "react";
import { Pressable, StyleSheet, Text, type View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type SkiaTabButtonProps = {
  ref?: Ref<View>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  index: number;
  isActive: boolean;
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SkiaTabButton = ({
  ref,
  icon,
  label,
  isActive,
  onPress,
  ...props
}: SkiaTabButtonProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { mass: 0.5, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { mass: 0.5, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      ref={ref}
      {...props}
      accessibilityLabel={`${label} tab`}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, animatedStyle]}
    >
      <Ionicons color={isActive ? "#fff" : "#64748B"} name={icon} size={24} />
      <Text style={[styles.text, isActive && styles.activeText]}>{label}</Text>
    </AnimatedPressable>
  );
};

SkiaTabButton.displayName = "SkiaTabButton";

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  text: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  activeText: {
    color: "#fff",
  },
});

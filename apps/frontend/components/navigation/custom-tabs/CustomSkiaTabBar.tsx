import {
  Blur,
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Paint,
  Path,
  rect,
  Skia,
} from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { TabTrigger } from "expo-router/ui";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useDerivedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SkiaTabButton } from "./SkiaTabButton";

const BOTTOM_BAR_HEIGHT_OFFSET = 30;

export function CustomSkiaTabBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();

  const bottomTabBarHeight = 45 + bottom / 2;
  const tabCount = 3;

  const animatedIndex = useDerivedValue(
    () => withSpring(currentIndex),
    [currentIndex]
  );

  const animatedCircleCx = useDerivedValue(
    () =>
      (screenWidth / tabCount) * animatedIndex.value +
      screenWidth / (tabCount * 2),
    [screenWidth, animatedIndex, tabCount]
  );

  const bottomTabPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    path.addRect(
      rect(
        -10,
        45,
        screenWidth + BOTTOM_BAR_HEIGHT_OFFSET,
        bottomTabBarHeight + BOTTOM_BAR_HEIGHT_OFFSET
      )
    );
    path.addCircle(
      animatedCircleCx.value,
      BOTTOM_BAR_HEIGHT_OFFSET,
      BOTTOM_BAR_HEIGHT_OFFSET
    );
    return path;
  }, [screenWidth, bottomTabBarHeight, animatedCircleCx]);

  const paint = useMemo(
    () => (
      <Paint>
        <Blur blur={5} />
        <ColorMatrix
          matrix={[
            1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 20, -10,
          ]}
        />
      </Paint>
    ),
    []
  );

  const handleTabPress = useCallback((index: number, name: string) => {
    setCurrentIndex(index);
    Haptics.selectionAsync();
  }, []);

  return (
    <View
      style={[
        styles.container,
        { height: bottomTabBarHeight + BOTTOM_BAR_HEIGHT_OFFSET },
      ]}
    >
      <Canvas style={StyleSheet.absoluteFillObject}>
        <Group layer={paint}>
          <Path color="white" path={bottomTabPath} />
        </Group>
        <Circle
          color="#7E6CE2"
          cx={animatedCircleCx}
          cy={BOTTOM_BAR_HEIGHT_OFFSET}
          r={28}
        />
      </Canvas>

      <View style={styles.tabButtonContainer}>
        <TabTrigger asChild name="swipe">
          <SkiaTabButton
            icon="swap-horizontal"
            index={0}
            isActive={currentIndex === 0}
            label="Swipe"
            onPress={() => handleTabPress(0, "swipe")}
          />
        </TabTrigger>

        <TabTrigger asChild name="browse">
          <SkiaTabButton
            icon="grid-outline"
            index={1}
            isActive={currentIndex === 1}
            label="Browse"
            onPress={() => handleTabPress(1, "browse")}
          />
        </TabTrigger>

        <TabTrigger asChild name="favorites">
          <SkiaTabButton
            icon="heart-outline"
            index={2}
            isActive={currentIndex === 2}
            label="Favorites"
            onPress={() => handleTabPress(2, "favorites")}
          />
        </TabTrigger>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 5,
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
  },
  tabButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: "100%",
    paddingBottom: 12,
  },
});

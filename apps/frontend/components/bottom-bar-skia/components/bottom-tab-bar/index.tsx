import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Blur,
  Circle,
  ColorMatrix,
  Group,
  Paint,
  Path,
  rect,
  Skia,
} from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import type React from "react";
import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useDerivedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Touchable from "react-native-skia-gesture";
import { scheduleOnRN } from "react-native-worklets";
import { ScreenNames } from "../../constants/screens";
import { BottomTabItem } from "./bottom-tab-item";

const BOTTOM_BAR_HEIGHT_OFFSET = 50;

const BottomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { width: screenWidth } = useWindowDimensions();

  const { bottom } = useSafeAreaInsets();
  const bottomTabNum = 65;
  const bottomTabBarHeight = bottomTabNum + bottom / 2;

  const tabBarScreens = Object.keys(ScreenNames).length;

  const currentIndex = state.index;
  const animatedIndex = useDerivedValue(
    () => withSpring(currentIndex),
    [currentIndex]
  );

  const animatedCircleCx = useDerivedValue(
    () =>
      (screenWidth / tabBarScreens) * animatedIndex.value +
      screenWidth / (tabBarScreens * 2),
    [screenWidth, animatedIndex, tabBarScreens]
  );

  const bottomTabPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const num = 45;
    path.addRect(
      rect(
        -10,
        num,
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

  const paint = useMemo(() => {
    const twenty = 20;
    return (
      <Paint>
        <Blur blur={5} />
        <ColorMatrix
          matrix={[
            // R, G, B, A, Position
            // prettier-ignore
            1,
            0,
            0,
            0,
            0,
            // prettier-ignore
            0,
            1,
            0,
            0,
            0,
            // prettier-ignore
            0,
            0,
            1,
            0,
            0,
            // prettier-ignore
            0,
            0,
            0,
            twenty,
            -10,
          ]}
        />
      </Paint>
    );
  }, []);

  const navigateTo = (
    screenName: (typeof ScreenNames)[keyof typeof ScreenNames]
  ) => {
    navigation.navigate(screenName);
  };

  return (
    <>
      <Touchable.Canvas
        style={[
          styles.container,
          {
            height: bottomTabBarHeight + BOTTOM_BAR_HEIGHT_OFFSET,
          },
        ]}
      >
        <Group layer={paint}>
          <Path color="white" path={bottomTabPath} />
        </Group>
        <Circle
          color={"#7E6CE2"}
          cx={animatedCircleCx}
          cy={BOTTOM_BAR_HEIGHT_OFFSET}
          r={43}
        />
        {Object.values(ScreenNames).map((screenName, index) => (
          <BottomTabItem
            currentIndex={currentIndex}
            height={bottomTabBarHeight}
            index={index}
            key={screenName}
            onTap={() => {
              "worklet";
              scheduleOnRN(navigateTo, screenName);
              scheduleOnRN(Haptics.selectionAsync);
            }}
            width={screenWidth / tabBarScreens}
            x={(screenWidth / tabBarScreens) * index}
            y={BOTTOM_BAR_HEIGHT_OFFSET}
          />
        ))}
      </Touchable.Canvas>
      <View
        style={{
          width: "100%",
          height: bottomTabBarHeight,
          zIndex: -5,
          opacity: 0,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    elevation: 5,
    left: 0,
    position: "absolute",
    right: 0,
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    width: "100%",
  },
});

export { BottomTabBar };

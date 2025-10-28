import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useCallback } from "react";
import { View } from "react-native";
import { BottomTabBar } from "./components/bottom-tab-bar";
import { ScreenNames } from "./constants/screens";

const BottomTab = createBottomTabNavigator();

const BackgroundView = () => (
  <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.1)" }} />
);

const BottomBarSkia = () => {
  const tabBar = useCallback(
    (props: BottomTabBarProps) => <BottomTabBar {...props} />,
    []
  );

  return (
    <BottomTab.Navigator tabBar={tabBar}>
      <BottomTab.Screen component={BackgroundView} name={ScreenNames.Home} />
      <BottomTab.Screen component={BackgroundView} name={ScreenNames.Search} />
      <BottomTab.Screen component={BackgroundView} name={ScreenNames.User} />
    </BottomTab.Navigator>
  );
};

export { BottomBarSkia };

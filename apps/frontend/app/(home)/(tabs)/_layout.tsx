import { TabList, TabSlot, Tabs, TabTrigger } from "expo-router/ui";
import { CustomSkiaTabBar } from "@/components/navigation/custom-tabs/CustomSkiaTabBar";

export default function HomeTabsLayout() {
  return (
    <Tabs>
      <TabSlot />

      {/* Custom Skia Tab Bar */}
      <CustomSkiaTabBar />

      {/* Hidden TabList for route definitions */}
      <TabList style={{ display: "none" }}>
        <TabTrigger href="/" name="swipe" />
        <TabTrigger href="/browse" name="browse" />
        <TabTrigger href="/favorites" name="favorites" />
      </TabList>
    </Tabs>
  );
}

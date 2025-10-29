import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { AntDesign } from "@expo/vector-icons";
import { Link } from "expo-router";
import { PressableScale } from "pressto";
import { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SwipeableCard } from "../../../components/SwipeCards";
import { IMAGES } from "../../../constants/Images";
import { useSwipeControls } from "../../../hooks/use-swipe-controls";

export default function SwipeCards() {
  const { activeIndex, refs, swipeRight, swipeLeft, reset } =
    useSwipeControls();

  const liked = useRef(0);
  const disliked = useRef(0);

  const onReset = useCallback(() => {
    activeIndex.value = 0;
    liked.current = 0;
    disliked.current = 0;

    reset();
  }, [activeIndex, reset]);

  return (
    <GestureHandlerRootView>
      <SignedIn>
        <View style={styles.container}>
          <View style={styles.cardsContainer}>
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={{
                marginTop: 20,
                justifyContent: "center",
                alignItems: "center",
                flex: 1,
              }}
            >
              {new Array(IMAGES.length).fill(0).map((_, index) => (
                <SwipeableCard
                  activeIndex={activeIndex}
                  image={IMAGES[index]}
                  index={index}
                  key={index}
                  onSwipeLeft={() => {
                    disliked.current += 1;
                  }}
                  onSwipeRight={() => {
                    liked.current += 1;
                  }}
                  ref={refs[index]}
                />
              ))}
            </Animated.View>
          </View>

          {/* Define the buttons container */}
          <View style={styles.buttonsContainer}>
            <PressableScale onPress={swipeLeft} style={styles.button}>
              <AntDesign color="white" name="close" size={32} />
            </PressableScale>
            <PressableScale
              onPress={onReset}
              style={[styles.button, { height: 60, marginHorizontal: 10 }]}
            >
              <AntDesign color="white" name="reload" size={24} />
            </PressableScale>
            <PressableScale onPress={swipeRight} style={styles.button}>
              <AntDesign color="white" name="heart" size={32} />
            </PressableScale>
          </View>
        </View>
      </SignedIn>
      <SignedOut>
        <Link href="/(auth)/sign-in">
          <Text>Sign in</Text>
        </Link>
        <Link href="/(auth)/sign-up">
          <Text>Sign up</Text>
        </Link>
      </SignedOut>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: "#3A3D45",
    borderRadius: 40,
    boxShadow: "0px 4px 0px rgba(0, 0, 0, 0.1)",
    height: 80,
    justifyContent: "center",
    marginHorizontal: 5,
  },
  buttonsContainer: {
    alignItems: "center",
    flexDirection: "row",
    height: 120,
    justifyContent: "center",
    paddingBottom: 90,
  },
  cardsContainer: {
    flex: 1,
  },
  container: {
    backgroundColor: "#242831",
    flex: 1,
  },
});

import { Image } from "expo-image";
import { type Ref, useCallback, useImperativeHandle, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { IMAGES } from "../constants/Images";

type SwipeableCardProps = {
  ref?: Ref<SwipeableCardRefType>;
  image?: (typeof IMAGES)[0] | null;
  index: number;
  activeIndex: SharedValue<number>;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  children?: React.ReactNode;
};

export type SwipeableCardRefType = {
  swipeRight: () => void;
  swipeLeft: () => void;
  reset: () => void;
};

const SIGNED_NORMALIZED_INPUT_RANGE = [-1, 0, 1];

const SwipeableCard = ({
  ref,
  image,
  index,
  activeIndex,
  onSwipeLeft,
  onSwipeRight,
  children,
}: SwipeableCardProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const currentActiveIndex = useSharedValue(Math.floor(activeIndex.value));
  const nextActiveIndex = useSharedValue(Math.floor(activeIndex.value));

  const { width } = useWindowDimensions();
  const translationMultiplier = 1.5;
  const maxCardTranslation = width * translationMultiplier;

  const swipeRight = useCallback(() => {
    onSwipeRight?.();
    translateX.value = withSpring(maxCardTranslation);
    activeIndex.value += 1;
  }, [activeIndex, maxCardTranslation, onSwipeRight, translateX]);

  const swipeLeft = useCallback(() => {
    onSwipeLeft?.();
    translateX.value = withSpring(-maxCardTranslation);
    activeIndex.value += 1;
  }, [activeIndex, maxCardTranslation, onSwipeLeft, translateX]);

  const reset = useCallback(() => {
    if (translateX.value !== 0) {
      cancelAnimation(translateX);
      translateX.value = withSpring(0);
    }
    if (translateX.value !== 0) {
      cancelAnimation(translateY);
      translateY.value = withSpring(0);
    }
  }, [translateX, translateY]);

  useImperativeHandle(
    ref,
    () => ({
      swipeLeft,
      swipeRight,
      reset,
    }),
    [swipeLeft, swipeRight, reset]
  );

  const translationFactor = 3;
  const inputTranslationRange = useMemo(
    () => [-width / translationFactor, 0, width / translationFactor],
    [width]
  );

  // Time (in seconds) needed for crossing to one extreme of the inputTranslationRange with a quick flick of a finger
  const FLICK_DURATION = 0.1;
  const inputVelocityRange = useMemo(
    () => [
      inputTranslationRange[0] / FLICK_DURATION,
      0,
      inputTranslationRange[2] / FLICK_DURATION,
    ],
    [inputTranslationRange]
  );

  const rotationFactor = 20;
  const rotate = useDerivedValue(
    () =>
      interpolate(
        translateX.value,
        inputTranslationRange,
        [-Math.PI / rotationFactor, 0, Math.PI / rotationFactor],
        Extrapolation.CLAMP
      ),
    [inputTranslationRange]
  );

  const gesture = Gesture.Pan()
    .onBegin(() => {
      currentActiveIndex.value = Math.floor(activeIndex.value);
    })
    .onUpdate((event) => {
      if (currentActiveIndex.value !== index) {
        return;
      }
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      const normalizedTranslationX = interpolate(
        translateX.value,
        inputTranslationRange,
        SIGNED_NORMALIZED_INPUT_RANGE,
        Extrapolation.EXTEND
      );

      const normalizedVelocityX = interpolate(
        event.velocityX,
        inputVelocityRange,
        SIGNED_NORMALIZED_INPUT_RANGE,
        Extrapolation.EXTEND
      );

      // Calculate decision boundary using unit circle formula (x² + y² = r² = 1).
      // When normalizedTranslation² + normalizedVelocity² crosses 1, the swipe is triggered.
      // This creates a circular decision boundary where both translation distance and velocity
      // contribute equally to the swipe decision.  A quick flick (high velocity, low distance)
      // and a slow drag (high distance, low velocity) are treated equivalently, while both
      // contribute always. Math.sign() preserves swipe direction.
      const signedNormalizedDecisionRadius =
        Math.sign(translateX.value) *
        (normalizedTranslationX * normalizedTranslationX +
          normalizedVelocityX * normalizedVelocityX);

      nextActiveIndex.value = interpolate(
        signedNormalizedDecisionRadius,
        SIGNED_NORMALIZED_INPUT_RANGE,
        [
          currentActiveIndex.value + 1,
          currentActiveIndex.value,
          currentActiveIndex.value + 1,
        ],
        Extrapolation.CLAMP
      );
    })
    .onFinalize((event) => {
      if (currentActiveIndex.value !== index) {
        return;
      }

      if (nextActiveIndex.value === activeIndex.value + 1) {
        const sign = Math.sign(event.translationX);
        if (sign === 1) {
          scheduleOnRN(swipeRight);
        } else {
          scheduleOnRN(swipeLeft);
        }
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const rCardStyle = useAnimatedStyle(() => {
    const newLocal = 5;
    const opacity = withTiming(index - activeIndex.value < newLocal ? 1 : 0);
    const swipeCardHeight = 23;
    const transY = withTiming((index - activeIndex.value) * swipeCardHeight);
    const scaleHeight = 0.07;
    const scale = withTiming(1 - scaleHeight * (index - activeIndex.value));
    return {
      opacity,
      transform: [
        { rotate: `${rotate.value}rad` },
        { translateY: transY },
        { scale },
        {
          translateX: translateX.value,
        },
        {
          translateY: translateY.value,
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            height: "75%",
            width: "90%",
            zIndex: -index,
          },
          rCardStyle,
        ]}
      >
        {children}
        {!children && image && (
          <View
            style={{
              flex: 1,
              borderRadius: 25,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            <Image
              cachePolicy={"memory-disk"}
              contentFit="cover"
              source={image}
              style={{ height: "100%", width: "100%" }}
            />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

export { SwipeableCard };

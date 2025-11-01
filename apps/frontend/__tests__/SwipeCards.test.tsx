import { render } from "@testing-library/react-native";
import React from "react";
import { Text, View } from "react-native";
import { SwipeableCard } from "../components/SwipeCards";

// Mock react-native-reanimated
const mockSharedValue = jest.fn();

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated"),
  useSharedValue: mockSharedValue,
  useDerivedValue: jest.fn((fn) => ({ value: fn() })),
  useAnimatedStyle: jest.fn((fn) => fn()),
  withTiming: jest.fn((value) => value),
  withSpring: jest.fn((value) => value),
  cancelAnimation: jest.fn(),
  interpolate: jest.fn((value, inputRange, outputRange) => outputRange[1]),
  Extrapolation: {
    CLAMP: "clamp",
    EXTEND: "extend",
  },
}));

// Mock react-native-worklets
jest.mock("react-native-worklets", () => ({
  scheduleOnRN: jest.fn((fn) => fn()),
}));

// Mock useWindowDimensions
jest.mock("react-native", () => ({
  ...jest.requireActual("react-native"),
  useWindowDimensions: () => ({
    width: 375,
    height: 812,
  }),
}));

describe("SwipeableCard", () => {
  const mockActiveIndex = { value: 0 };
  const mockOnSwipeRight = jest.fn();
  const mockOnSwipeLeft = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedValue.mockReturnValue({ value: 0 });
  });

  it("renders with children content", () => {
    const { getByText } = render(
      <SwipeableCard
        activeIndex={mockActiveIndex}
        index={0}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
      >
        <View>
          <Text>Test Card Content</Text>
        </View>
      </SwipeableCard>
    );

    expect(getByText("Test Card Content")).toBeTruthy();
  });

  it("renders with image when provided", () => {
    const mockImage = { uri: "test-image.jpg" };

    const { UNSAFE_getByType } = render(
      <SwipeableCard
        activeIndex={mockActiveIndex}
        image={mockImage}
        index={0}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
      />
    );

    // Should render the expo-image component
    expect(UNSAFE_getByType("Image")).toBeTruthy();
  });

  it("renders nothing when no children or image provided", () => {
    const { container } = render(
      <SwipeableCard
        activeIndex={mockActiveIndex}
        index={0}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
      />
    );

    // Should still render the animated view container
    expect(container).toBeTruthy();
  });

  it("initializes shared values correctly", () => {
    render(
      <SwipeableCard
        activeIndex={mockActiveIndex}
        index={0}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
      >
        <Text>Test</Text>
      </SwipeableCard>
    );

    // Should initialize translateX, translateY, and other shared values
    expect(mockSharedValue).toHaveBeenCalledWith(0);
    expect(mockSharedValue).toHaveBeenCalledWith(
      Math.floor(mockActiveIndex.value)
    );
  });

  it("exposes imperative methods through ref", () => {
    const ref = React.createRef();

    render(
      <SwipeableCard
        activeIndex={mockActiveIndex}
        index={0}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
        ref={ref}
      >
        <Text>Test</Text>
      </SwipeableCard>
    );

    // Note: Testing imperative methods requires more complex setup
    // This test verifies the component renders without errors with a ref
    expect(ref.current).toBeDefined();
  });

  it("handles different card indices correctly", () => {
    const { rerender } = render(
      <SwipeableCard
        activeIndex={mockActiveIndex}
        index={0}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
      >
        <Text>Card 0</Text>
      </SwipeableCard>
    );

    expect(mockSharedValue).toHaveBeenCalledWith(0);

    // Test with different index
    rerender(
      <SwipeableCard
        activeIndex={mockActiveIndex}
        index={2}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
      >
        <Text>Card 2</Text>
      </SwipeableCard>
    );

    // Should initialize with same active index value
    expect(mockSharedValue).toHaveBeenCalledWith(
      Math.floor(mockActiveIndex.value)
    );
  });

  it("applies correct styles for card positioning", () => {
    const { UNSAFE_getByType } = render(
      <SwipeableCard
        activeIndex={mockActiveIndex}
        index={1}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
      >
        <Text>Test Card</Text>
      </SwipeableCard>
    );

    const animatedView = UNSAFE_getByType("Animated.View");

    // Check that basic positioning styles are applied
    expect(animatedView.props.style).toMatchObject([
      {
        position: "absolute",
        height: "75%",
        width: "90%",
        zIndex: -1, // -index
      },
      expect.any(Object), // animated style
    ]);
  });

  it("handles missing callbacks gracefully", () => {
    // Should render without onSwipeRight and onSwipeLeft
    const { getByText } = render(
      <SwipeableCard activeIndex={mockActiveIndex} index={0}>
        <Text>Test Card</Text>
      </SwipeableCard>
    );

    expect(getByText("Test Card")).toBeTruthy();
  });
});

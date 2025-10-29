import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { PressableScale } from "pressto";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { RecipeCard } from "../../../components/RecipeCard";
import { RecipeCardSkeleton } from "../../../components/RecipeCardSkeleton";
import { SwipeableCard } from "../../../components/SwipeCards";
import { useRecipeSwipe } from "../../../hooks/use-recipe-swipe";

type RecipeSwipeScreenProps = {
  sessionId?: string;
};

export default function RecipeSwipeScreen({
  sessionId,
}: RecipeSwipeScreenProps) {
  const [showFilters, setShowFilters] = useState(false);

  const {
    recipes,
    currentRecipe,
    isLoading,
    error,
    hasMore,
    activeIndex,
    refs,
    swipeRight,
    swipeLeft,
    reset,
    undo,
    likedCount,
    dislikedCount,
    reload,
  } = useRecipeSwipe({
    sessionId,
    onMatch: (recipeId) => {
      Alert.alert(
        "It's a Match! 🎉",
        "Your dining buddy also liked this recipe!",
        [{ text: "Great!", style: "default" }]
      );
    },
  });

  const onReset = useCallback(() => {
    Alert.alert(
      "Reset Cards",
      "Are you sure you want to reset and start over?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: reset },
      ]
    );
  }, [reset]);

  const renderContent = () => {
    // Loading state
    if (isLoading && recipes.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <RecipeCardSkeleton />
          <ActivityIndicator
            color="#FFF"
            size="large"
            style={styles.loadingIndicator}
          />
          <Text style={styles.loadingText}>Loading delicious recipes...</Text>
        </View>
      );
    }

    // Error state
    if (error && recipes.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons color="#FF4458" name="alert-circle-outline" size={64} />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <PressableScale onPress={reload} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </PressableScale>
        </View>
      );
    }

    // No more recipes
    if (!hasMore && recipes.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons color="#FFF" name="restaurant-outline" size={64} />
          <Text style={styles.emptyTitle}>No More Recipes!</Text>
          <Text style={styles.emptyMessage}>
            You've swiped through all available recipes.
          </Text>
          <PressableScale onPress={reset} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Start Over</Text>
          </PressableScale>
        </View>
      );
    }

    // Cards view
    return (
      <>
        <View style={styles.cardsContainer}>
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.cardStack}
          >
            {recipes.map((recipe, index) => (
              <SwipeableCard
                activeIndex={activeIndex}
                image={recipe.imageUrl}
                index={index}
                key={recipe._id}
                onSwipeLeft={() => {
                  // Swipe callback handled in hook
                }}
                onSwipeRight={() => {
                  // Swipe callback handled in hook
                }}
                ref={refs[index]} // We'll pass a custom render
              >
                <RecipeCard
                  isTopCard={index === Math.floor(activeIndex.value)}
                  recipe={recipe}
                />
              </SwipeableCard>
            ))}
          </Animated.View>

          {/* Stats overlay */}
          <View style={styles.statsOverlay}>
            <View style={styles.stat}>
              <Ionicons color="#4FC3F7" name="heart" size={20} />
              <Text style={styles.statText}>{likedCount}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons color="#FF4458" name="close" size={20} />
              <Text style={styles.statText}>{dislikedCount}</Text>
            </View>
          </View>
        </View>

        {/* Control buttons */}
        <View style={styles.buttonsContainer}>
          <PressableScale
            disabled={activeIndex.value === 0}
            onPress={undo}
            style={[styles.button, styles.smallButton]}
          >
            <Ionicons
              color={activeIndex.value === 0 ? "#666" : "white"}
              name="arrow-undo"
              size={20}
            />
          </PressableScale>

          <PressableScale onPress={swipeLeft} style={styles.button}>
            <AntDesign color="white" name="close" size={32} />
          </PressableScale>

          <PressableScale
            onPress={onReset}
            style={[styles.button, styles.smallButton]}
          >
            <AntDesign color="white" name="reload" size={20} />
          </PressableScale>

          <PressableScale onPress={swipeRight} style={styles.button}>
            <AntDesign color="white" name="heart" size={32} />
          </PressableScale>

          <PressableScale
            onPress={() => setShowFilters(true)}
            style={[styles.button, styles.smallButton]}
          >
            <Ionicons color="white" name="options" size={20} />
          </PressableScale>
        </View>
      </>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SignedIn>{renderContent()}</SignedIn>
      <SignedOut>
        <View style={styles.signInContainer}>
          <Text style={styles.signInTitle}>Sign in to start swiping!</Text>
          <Link href="/(auth)/sign-in">
            <Text style={styles.signInButton}>Sign In</Text>
          </Link>
          <Link href="/(auth)/sign-up">
            <Text style={styles.signUpButton}>Sign Up</Text>
          </Link>
        </View>
      </SignedOut>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#242831",
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  cardsContainer: {
    flex: 1,
  },
  cardStack: {
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  statsOverlay: {
    position: "absolute",
    top: 40,
    right: 20,
    flexDirection: "row",
    gap: 15,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingIndicator: {
    marginTop: 20,
  },
  loadingText: {
    color: "#FFF",
    fontSize: 16,
    marginTop: 10,
  },
  errorTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
  },
  errorMessage: {
    color: "#AAA",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
  },
  emptyMessage: {
    color: "#AAA",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: "#4FC3F7",
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonsContainer: {
    alignItems: "center",
    flexDirection: "row",
    height: 120,
    justifyContent: "center",
    paddingBottom: 90,
    gap: 10,
  },
  button: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: "#3A3D45",
    borderRadius: 40,
    boxShadow: "0px 4px 0px rgba(0, 0, 0, 0.1)",
    height: 80,
    justifyContent: "center",
  },
  smallButton: {
    height: 50,
  },
  signInContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  signInTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 30,
  },
  signInButton: {
    color: "#4FC3F7",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
  },
  signUpButton: {
    color: "#FFF",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});

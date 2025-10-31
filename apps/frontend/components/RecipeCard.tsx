import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type React from "react";
import { useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import type { RecipeCard as RecipeCardType } from "../types/recipe";

type RecipeCardProps = {
  recipe: RecipeCardType;
  isTopCard?: boolean;
};

const { width: screenWidth } = Dimensions.get("window");
const cardWidthFactor = 0.9;
const CARD_WIDTH = screenWidth * cardWidthFactor;
const heightMultiplier = 1.4;
const CARD_HEIGHT = CARD_WIDTH * heightMultiplier;

// Default fallback image
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  isTopCard = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "#4CAF50";
      case "medium":
        return "#FF9800";
      case "hard":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDietaryTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return null;
    // Show max 2 tags to avoid clutter
    const displayTags = tags.slice(0, 2);
    const remaining = tags.length - 2;

    return (
      <View style={styles.dietaryTags}>
        {displayTags.map((tag, index) => (
          <View key={index} style={styles.dietaryTag}>
            <Text style={styles.dietaryTagText}>{tag}</Text>
          </View>
        ))}
        {remaining > 0 && (
          <View style={styles.dietaryTag}>
            <Text style={styles.dietaryTagText}>+{remaining}</Text>
          </View>
        )}
      </View>
    );
  };

  // Determine which image to use
  const imageSource =
    imageError || !recipe.imageUrl ? FALLBACK_IMAGE : recipe.imageUrl;

  return (
    <View style={styles.container}>
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={() => setImageError(true)}
        placeholder={{ uri: FALLBACK_IMAGE }}
        placeholderContentFit="cover"
        priority={isTopCard ? "high" : "normal"}
        source={{ uri: imageSource }}
        style={styles.image}
        transition={300}
      />

      {/* Gradient overlay for better text readability */}
      <LinearGradient
        colors={["transparent", "transparent", "rgba(0,0,0,0.8)"]}
        style={styles.gradient}
      />

      {/* Top info badges */}
      <View style={styles.topInfo}>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(recipe.difficulty) },
          ]}
        >
          <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
        </View>
        {recipe.cuisineType && (
          <View style={styles.cuisineBadge}>
            <Text style={styles.cuisineText}>{recipe.cuisineType}</Text>
          </View>
        )}
      </View>

      {/* Bottom info section */}
      <View style={styles.bottomInfo}>
        {/* Title and description */}
        <Text numberOfLines={2} style={styles.title}>
          {recipe.title}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {recipe.description}
        </Text>

        {/* Dietary tags */}
        {formatDietaryTags(recipe.dietaryTags)}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {/* Time */}
          <View style={styles.stat}>
            <Ionicons color="#FFF" name="time-outline" size={16} />
            <Text style={styles.statText}>
              {formatTime(recipe.prepTime + recipe.cookTime)}
            </Text>
          </View>

          {/* Calories */}
          <View style={styles.stat}>
            <MaterialCommunityIcons color="#FFF" name="fire" size={16} />
            <Text style={styles.statText}>{recipe.nutrition.calories} cal</Text>
          </View>

          {/* Protein */}
          <View style={styles.stat}>
            <MaterialCommunityIcons color="#FFF" name="food-steak" size={16} />
            <Text style={styles.statText}>
              {recipe.nutrition.protein}g protein
            </Text>
          </View>

          {/* Servings */}
          <View style={styles.stat}>
            <Ionicons color="#FFF" name="people-outline" size={16} />
            <Text style={styles.statText}>{recipe.servings}</Text>
          </View>
        </View>
      </View>

      {/* Swipe hint icons (only for top card) */}
      {isTopCard && (
        <>
          <View style={[styles.swipeHint, styles.swipeHintLeft]}>
            <Ionicons color="#FF4458" name="close-circle" size={80} />
          </View>
          <View style={[styles.swipeHint, styles.swipeHintRight]}>
            <Ionicons color="#4FC3F7" name="heart-circle" size={80} />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  topInfo: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  difficultyText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cuisineBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cuisineText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "600",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 12,
    lineHeight: 18,
  },
  dietaryTags: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  dietaryTag: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  dietaryTagText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "500",
  },
  swipeHint: {
    position: "absolute",
    top: "50%",
    marginTop: -40,
    opacity: 0,
  },
  swipeHintLeft: {
    left: 20,
  },
  swipeHintRight: {
    right: 20,
  },
});

export default RecipeCard;

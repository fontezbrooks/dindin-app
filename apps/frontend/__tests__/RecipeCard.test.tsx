import { render } from "@testing-library/react-native";
import { RecipeCard } from "../components/RecipeCard";
import type { RecipeCard as RecipeCardType } from "../types/recipe";

describe("RecipeCard", () => {
  const mockRecipe: RecipeCardType = {
    _id: "1",
    title: "Test Recipe",
    description: "A delicious test recipe for unit testing",
    imageUrl: "https://example.com/recipe.jpg",
    prepTime: 10,
    cookTime: 20,
    difficulty: "easy",
    cuisineType: "Italian",
    dietaryTags: ["vegetarian", "gluten-free"],
    nutrition: {
      calories: 350,
      protein: 15,
    },
    servings: 4,
  };

  it("renders correctly with recipe data", () => {
    const { getByText } = render(<RecipeCard recipe={mockRecipe} />);

    // Check if title is rendered
    expect(getByText("Test Recipe")).toBeTruthy();

    // Check if description is rendered
    expect(getByText("A delicious test recipe for unit testing")).toBeTruthy();

    // Check if difficulty is rendered
    expect(getByText("easy")).toBeTruthy();

    // Check if cuisine type is rendered
    expect(getByText("Italian")).toBeTruthy();

    // Check if dietary tags are rendered
    expect(getByText("vegetarian")).toBeTruthy();
    expect(getByText("gluten-free")).toBeTruthy();

    // Check if nutrition info is rendered
    expect(getByText("350 cal")).toBeTruthy();
    expect(getByText("15g protein")).toBeTruthy();

    // Check if servings are rendered
    expect(getByText("4")).toBeTruthy();
  });

  it("renders correctly as top card", () => {
    const { queryByTestId } = render(
      <RecipeCard isTopCard={true} recipe={mockRecipe} />
    );

    // When implementing, add testIDs to swipe hints
    // expect(queryByTestId('swipe-hint-left')).toBeTruthy();
    // expect(queryByTestId('swipe-hint-right')).toBeTruthy();
  });

  it("handles long titles and descriptions correctly", () => {
    const longRecipe: RecipeCardType = {
      ...mockRecipe,
      title:
        "This is a very long recipe title that should be truncated after two lines of text to prevent overflow",
      description:
        "This is an extremely long description that goes on and on and on and should also be truncated after two lines to maintain the card layout and prevent text from overflowing the card boundaries",
    };

    const { getByText } = render(<RecipeCard recipe={longRecipe} />);

    // The text should be rendered (though it will be truncated visually)
    expect(getByText(longRecipe.title)).toBeTruthy();
    expect(getByText(longRecipe.description)).toBeTruthy();
  });

  it("formats time correctly", () => {
    const recipes = [
      { ...mockRecipe, prepTime: 30, cookTime: 0 }, // 30 min
      { ...mockRecipe, prepTime: 45, cookTime: 45 }, // 1h 30m
      { ...mockRecipe, prepTime: 60, cookTime: 60 }, // 2h
    ];

    const { rerender, getByText } = render(<RecipeCard recipe={recipes[0]} />);
    expect(getByText("30 min")).toBeTruthy();

    rerender(<RecipeCard recipe={recipes[1]} />);
    expect(getByText("1h 30m")).toBeTruthy();

    rerender(<RecipeCard recipe={recipes[2]} />);
    expect(getByText("2h")).toBeTruthy();
  });

  it("handles empty dietary tags gracefully", () => {
    const recipeWithoutTags: RecipeCardType = {
      ...mockRecipe,
      dietaryTags: [],
    };

    const { queryByText } = render(<RecipeCard recipe={recipeWithoutTags} />);

    // Should not crash and dietary tags section should not be visible
    expect(queryByText("vegetarian")).toBeNull();
    expect(queryByText("gluten-free")).toBeNull();
  });

  it("displays difficulty with correct color", () => {
    const difficulties: Array<RecipeCardType["difficulty"]> = [
      "easy",
      "medium",
      "hard",
    ];

    difficulties.forEach((difficulty) => {
      const recipe = { ...mockRecipe, difficulty };
      const { getByText } = render(<RecipeCard recipe={recipe} />);
      expect(getByText(difficulty)).toBeTruthy();
    });
  });

  it("limits dietary tags display to 2 with overflow indicator", () => {
    const recipeWithManyTags: RecipeCardType = {
      ...mockRecipe,
      dietaryTags: [
        "vegan",
        "gluten-free",
        "dairy-free",
        "nut-free",
        "soy-free",
      ],
    };

    const { getByText, queryByText } = render(
      <RecipeCard recipe={recipeWithManyTags} />
    );

    // First two tags should be visible
    expect(getByText("vegan")).toBeTruthy();
    expect(getByText("gluten-free")).toBeTruthy();

    // Overflow indicator should show +3
    expect(getByText("+3")).toBeTruthy();

    // Other tags should not be directly visible
    expect(queryByText("dairy-free")).toBeNull();
    expect(queryByText("nut-free")).toBeNull();
    expect(queryByText("soy-free")).toBeNull();
  });
});

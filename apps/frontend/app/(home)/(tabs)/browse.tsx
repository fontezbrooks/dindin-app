import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const foodItems = [
  { id: 1, name: "Pizza", image: "🍕", price: "$12.99", category: "Italian" },
  { id: 2, name: "Burger", image: "🍔", price: "$9.99", category: "American" },
  { id: 3, name: "Sushi", image: "🍣", price: "$15.99", category: "Japanese" },
  { id: 4, name: "Tacos", image: "🌮", price: "$8.99", category: "Mexican" },
  { id: 5, name: "Pasta", image: "🍝", price: "$11.99", category: "Italian" },
  { id: 6, name: "Salad", image: "🥗", price: "$7.99", category: "Healthy" },
  { id: 7, name: "Ramen", image: "🍜", price: "$13.99", category: "Japanese" },
  {
    id: 8,
    name: "Sandwich",
    image: "🥪",
    price: "$6.99",
    category: "American",
  },
];

export default function BrowseScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Browse Foods</Text>
      <View style={styles.grid}>
        {foodItems.map((item) => (
          <Pressable key={item.id} style={styles.card}>
            <Text style={styles.emoji}>{item.image}</Text>
            <Text style={styles.foodName}>{item.name}</Text>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.price}>{item.price}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#242831",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    margin: 20,
    color: "#fff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
  },
  card: {
    width: "45%",
    backgroundColor: "#3A3D45",
    margin: "2.5%",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    color: "#fff",
  },
  category: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    color: "#7E6CE2",
    fontWeight: "500",
  },
});

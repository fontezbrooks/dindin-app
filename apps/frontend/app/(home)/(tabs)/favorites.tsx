import { Ionicons } from "@expo/vector-icons";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const favoriteItems = [
  {
    id: 1,
    name: "Margherita Pizza",
    restaurant: "Italian Bistro",
    rating: 4.8,
    price: "$12.99",
  },
  {
    id: 2,
    name: "Sushi Platter",
    restaurant: "Tokyo Express",
    rating: 4.9,
    price: "$18.99",
  },
  {
    id: 3,
    name: "Classic Burger",
    restaurant: "Burger Joint",
    rating: 4.7,
    price: "$10.99",
  },
  {
    id: 4,
    name: "Pad Thai",
    restaurant: "Thai Garden",
    rating: 4.6,
    price: "$13.99",
  },
  {
    id: 5,
    name: "Caesar Salad",
    restaurant: "Green Cafe",
    rating: 4.5,
    price: "$8.99",
  },
  {
    id: 6,
    name: "Chicken Tacos",
    restaurant: "Taco Stand",
    rating: 4.8,
    price: "$9.99",
  },
];

export default function FavoritesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Favorites</Text>
      <FlatList
        data={favoriteItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Pressable style={styles.item}>
            <View style={styles.itemContent}>
              <View style={styles.leftContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.restaurant}>{item.restaurant}</Text>
                <Text style={styles.price}>{item.price}</Text>
              </View>
              <View style={styles.rightContent}>
                <View style={styles.rating}>
                  <Ionicons color="#FFB800" name="star" size={16} />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
                <Pressable style={styles.heartButton}>
                  <Ionicons color="#7E6CE2" name="heart" size={20} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
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
  item: {
    backgroundColor: "#3A3D45",
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  itemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    alignItems: "flex-end",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
    color: "#fff",
  },
  restaurant: {
    fontSize: 14,
    color: "#999",
    marginBottom: 5,
  },
  price: {
    fontSize: 16,
    color: "#7E6CE2",
    fontWeight: "600",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  heartButton: {
    padding: 5,
  },
});

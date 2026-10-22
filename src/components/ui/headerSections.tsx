import { Colors, fontFamily } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HeaderSection = ({ title }: any) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {title}
          </Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
  );
};

export default HeaderSection;

const styles = StyleSheet.create({
  header: {
    paddingVertical: 10,
    paddingBottom: -30,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: fontFamily.sans,
  },
  placeholder: {
    width: 40,
  },
});

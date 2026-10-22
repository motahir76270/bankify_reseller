import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const company = async()=> {
    const domain = JSON.parse(await AsyncStorage.getItem("domain") as any);
    const token = JSON.parse(await AsyncStorage.getItem("token") as any);
    
  return {
    logo :require("../../assets/images/icon.png"),
    name: "",
    BASE_URL: `https://${domain}/api/v1`,
    token:token
  }
};

export const icons = {
  errowBack: <Ionicons name="arrow-back" size={24} color="black" />,
  person: <Ionicons name="person-sharp" size={24} color="black" />,
};


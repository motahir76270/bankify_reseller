
import { setLocation } from "@/redux/slices/authSlice";
import * as Location from "expo-location";
import { Alert } from "react-native";

export const onLocation = async (dispatch:any) => {
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission to access location was denied");
      return;
    }

    let loc = await Location.getCurrentPositionAsync({});    
    dispatch(setLocation(loc.coords as any));
  };

  
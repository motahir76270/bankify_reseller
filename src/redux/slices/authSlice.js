import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { Alert } from "react-native";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: "",
    forgetPasword: "",
    loading: false,
    customerList: [],
    location:{}
  },
  reducers: {
    setUser: (state, actions) => {
      state.user = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
    setCustomerList: (state, actions) => {
      state.customerList = actions.payload;
    },
    setLocation: (state, actions) => {
      state.location = actions.payload;
    },
  },
});

export const { setCustomerList, setUser,setLoading ,setLocation} = authSlice.actions;

export default authSlice.reducer;

export const getTenetUserApiCall = async (formdata,location,dispatch) => {
  try {
    dispatch(setLoading(true));
  const res = await fetch(`https://superadmin.bankfipay.com/api/v1/auth/tenant-by-user`, {
    method: "POST",
    body: JSON.stringify(formdata),
    headers: {
      "Content-Type": "application/json",
    },
  });
    const data = await res.json();
    
    if(data?.success === true){
      await AsyncStorage.setItem("domain", JSON.stringify(data?.data?.domain));
      const domain = JSON.parse(await AsyncStorage.getItem("domain"));
      // console.log("domain", domain)
      if(domain){
        const payload = {
            accuracy: location?.accuracy,
            identifier: formdata?.identifier,
            latitude: location?.longitude,
            longitude: location?.altitude,
            password: formdata?.password,
            type: "USER"
        } 
        await LoginApiCall(domain,payload,dispatch)
      }
     return domain; 
    }else{
      showError("Faled", data?.message || "server not respond")
    }
   } catch (error) {
    showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};

export const LoginApiCall = async (domain,payload,dispatch) => {
  try {
    dispatch(setLoading(true));
  const res = await fetch(`https://${domain}/api/v1/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();

     if(data?.success === true){
      await AsyncStorage.setItem("user", JSON.stringify(data?.data));
      await AsyncStorage.setItem("token", JSON.stringify(data?.data?.accessToken));
      const user = JSON.parse(await AsyncStorage.getItem("user"));
      dispatch(setUser(user))
      router.push('/(tabs)')
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
    showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};

export const getMeApiCall = async (dispatch) => {
  try {
  dispatch(setLoading(true));
    const { BASE_URL ,token} = await company();
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
       Authorization: `Bearer ${token}`,
    },
   });
    const data = await res.json();
  
     if(data?.success === true){
      dispatch(setUser(data?.data))
      return data?.data;
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
    showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};

export const logoutApiCall = async (dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL,token } = await company();
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
     const data = await res.json();
    if(data?.success === true){
      showSuccess('Sucess', data?.message)
      await  AsyncStorage.removeItem('user')
      await AsyncStorage.removeItem('token')
      router.replace('/(auth)/login')
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
    showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};

export const forgetPasswordApiCall = async (payload,dispatch) => {
  try {
     dispatch(setLoading(true));
    const domain = await getTenetUserApiCall(payload,dispatch)
    if(!domain) return ;

    const res = await fetch(`https://${domain}/api/v1/auth/forgot-password`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });
  const data = await res.json();

   if(data?.success === true){
      showSuccess("Success", data?.message )
      router.back()
      return data
   }else{
      showError("Falied", data?.message )
   }
   } catch (error) {
    showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(true));
   }
};

export const changePasswordApiCall = async (payload,dispatch) => {
  try {
     dispatch(setLoading(true));
    const { BASE_URL ,token} = await company();
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
   const data = await res.json();

   if(data?.success === true){
      showSuccess("Success", data?.message )
      router.back()
      return data;
   }else{
      showError("Falied", data?.message )
   }
   } catch (error) {
    showError("Failed", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(true));
   }
};


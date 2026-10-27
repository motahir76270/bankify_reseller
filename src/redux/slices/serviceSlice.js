import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { Alert } from "react-native";
import axios from "axios";

const servicesSlice = createSlice({
  name: "services",
  initialState: {
    dashboardData: "",
    serviceMapingId:[],
    loading: false,
  },
  reducers: {
    setDashBoard: (state, actions) => {
      state.dashboardData = actions.payload;
    },
    setServiceMapingId: (state, actions) => {
      state.serviceMapingId = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setDashBoard,setServiceMapingId,setLoading} = servicesSlice.actions;

export default servicesSlice.reducer;

export const getDashboardDataApiCall = async (dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/dashboard`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setDashBoard(data?.data))
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

export const getServiceMapingIdDataApiCall = async (dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/admin/mappings/allowed?`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setServiceMapingId(data?.data))
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

export const verifyPanApiCall  = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/pan-verification`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
        "Content-Type":'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
     return data;
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};


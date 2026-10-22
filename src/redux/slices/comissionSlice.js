import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { Alert } from "react-native";
import axios from "axios";

const commissionSlice = createSlice({
  name: "commission",
  initialState: {
    commissionRulesListData: "",
    serviceMapList:[],
    commisionApplicableList:[],
    loading: false,
  },
  reducers: {
    setCommissionRulesList: (state, actions) => {
      state.commissionRulesListData = actions.payload;
    },
    setServiceMapList: (state, actions) => {
      state.serviceMapList = actions.payload;
    },
    setCommisionApplicableList: (state, actions) => {
      state.commisionApplicableList = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setCommissionRulesList,setServiceMapList,setCommisionApplicableList,setLoading} = commissionSlice.actions;

export default commissionSlice.reducer;

export const getcommissionRulesListDataApiCall = async (filter,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/commission?page=1&limit=20`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setCommissionRulesList(data?.data))
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

export const getServiceMapingListDataApiCall = async (dispatch) => {
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
      dispatch(setServiceMapList(data?.data))
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

export const createCommissionRuleApiCall = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/commission`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();

     if(data?.success === true){
      showSuccess("SUCCESS", data?.message)

       getcommissionRulesListDataApiCall(payload,dispatch)
      return data;
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};

export const updateCommissionRuleStatusApiCall = async (payload,id,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/commission/${id}`, {
      method: "PUT",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();

     if(data?.success === true){
        const payload=""
      getcommissionRulesListDataApiCall(payload,dispatch)
      showSuccess("SUCCESS", data?.message)
      return data;
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};


//aplicable commission rule
export const getApplicableCommissionListDataApiCall = async (id,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/commission/child/${id}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();

    
     if(data?.success === true){
      dispatch(setCommisionApplicableList(data?.data))
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






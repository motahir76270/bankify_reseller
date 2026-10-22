import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { Alert } from "react-native";
import axios from "axios";

const profileKycSlice = createSlice({
  name: "profileKyc",
  initialState: {
    states: [],
    cities: [],
    KYCData:{},
    myKycData:"",
    pendingKycList:[],
    loading:false
  },
  reducers: {
    setStates: (state, actions) => {
      state.states = actions.payload;
    },
    setCities: (state, actions) => {
      state.cities = actions.payload;
    },
    setKYCData:(state, actions)=> {
        state.KYCData = actions.payload;
    },
    setMyKYCData:(state, actions)=> {
        state.myKycData = actions.payload;
    },
    setPendingKycList:(state, actions)=> {
        state.pendingKycList = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setStates,setCities,setKYCData,setMyKYCData,setPendingKycList,setLoading} = profileKycSlice.actions;

export default profileKycSlice.reducer;



export const getAllStatesApiCall = async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const { BASE_URL } = await company();
    const res = await fetch(`${BASE_URL}/state-city/states`, {
     method: "GET",
     });
    const data = await res.json();
     
     if(data?.success === true){
      dispatch(setStates(data?.data))
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

export const getAllCitiesApiCall = async (stateCode,dispatch) => {
  try {
    // console.log(stateCode);
    
    dispatch(setLoading(true));
    const { BASE_URL } = await company();
    const res = await fetch(`${BASE_URL}/state-city/cities/state/${stateCode}`, {
     method: "GET",
     });
    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setCities(data?.data))
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

export const kycSubmitApiCall = async (payload,dispatch) => {
  try {
    dispatch(setLoading(true));
    const { BASE_URL,token } = await company();
    const res = await axios.post(`${BASE_URL}/kyc/submit`,payload,{
        headers:{
             Authorization: `Bearer ${token}`,
        }
    });
    console.log(payload);
    
    const data = data?.data
     if(data?.success === true){
         showSuccess("Success", data?.message)
         router.replace('/(tabs)')
         dispatch(setCities(data?.data))
      return data?.data;
     }
   }finally{
     dispatch(setLoading(false));
   }
}

export const PrevioutKycApiCall = async (id,dispatch) => {
  try {  
    dispatch(setLoading(true));
    const { BASE_URL,token } = await company();
    const res = await fetch(`${BASE_URL}/kyc/status/${id}`,{
        method:"GET"
    });
    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setKYCData(data?.data))
    //   console.log("snbfhfas",data);
      return data?.data;
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
}


//white level 
export const getPendingKycListApiCall = async (payload,dispatch) => {
  try {  
    dispatch(setLoading(true));
    const { BASE_URL,token } = await company();
    const res = await fetch(`${BASE_URL}/kyc/list?page=${payload?.page||1}&limit=20&status=ALL&search=${payload?.search}`,{
        method:"GET",
            headers:{
           Authorization: `Bearer ${token}`,
        }
    });
    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setPendingKycList(data?.data))
    //   console.log("snbfhfas",data);
      return data?.data;
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
}

export const updateProfileKycStatusApiCall = async (payload,status,dispatch) => {
  try {  
    dispatch(setLoading(true));
    // console.log(status);
    
    const { BASE_URL,token } = await company();
    const res = await fetch(`${BASE_URL}/kyc/${status}`,{
        method:"POST",
        body:JSON.stringify(payload),
        headers:{
          'Content-Type':'application/json',
           Authorization: `Bearer ${token}`,
        }
    });
    // approvalNotes
    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setPendingKycList(data?.data))
    //   console.log("snbfhfas",data);
      showError("SUCCESS", data?.message)
      return data?.data;
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
}


export const getMyKycDataApiCall = async (userId,dispatch) => {
  try {  
    dispatch(setLoading(true));
    const { BASE_URL,token } = await company();
    const res = await fetch(`${BASE_URL}/kyc/status/${userId}`,{
        method:"GET",
           headers:{
           Authorization: `Bearer ${token}`,
        }
    });
    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setMyKYCData(data?.data))
    //   console.log("snbfhfas",data);
      return data?.data;
     }else{
      showError("Failed", data?.message)
     }
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
}


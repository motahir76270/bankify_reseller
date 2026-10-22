import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { Alert } from "react-native";
import axios from "axios";
import { setMyBankResquestList } from "./bankAccountSlice";

const addFundSlice = createSlice({
  name: "addFund",
  initialState: {
    status: "",
    bankDetails: "",
    fundRequestList:"",
    loading:false
  },
  reducers: {
    setStatus: (state, actions) => {
      state.status = actions.payload;
    },
    setBankDetails: (state, actions) => {
      state.bankDetails = actions.payload;
    },
    setFundRequestList: (state, actions) => {
      state.fundRequestList = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setStatus,setBankDetails,setFundRequestList,setLoading} = addFundSlice.actions;

export default addFundSlice.reducer;

export const checkFundStatusApiCall = async (dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL,token } = await company();
    const res = await fetch(`${BASE_URL}/fund-request`, {
     method: "GET",
            Authorization: `Bearer ${token}`,
     });
    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setStatus(data?.data))
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

export const addFundRequestApiCall = async (payload,dispatch) => {
  try {
    dispatch(setLoading(true))
    // https://tahir.azzunique.cloud/api/v1/fund-request
    const { BASE_URL,token } = await company();
    // console.log(payload);
    
    const res = await axios.post(
       `${BASE_URL}/fund-request`,
       payload,
     {
      headers: {
        Authorization: `Bearer ${token}`,
       },
     }
    );
    const data = await res.data;
        // console.log(data);
     if(data?.success === true){
      dispatch(setStatus(data?.data))
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

export const getBankFundReqApiCall = async (dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL } = await company();
    const res = await fetch(`${BASE_URL}/bank/parent-bank-details`, {
     method: "GET",
     });
    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setBankDetails(data?.data))
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


//admin(means white level)
export const getFundRequestLsitApiCall = async (payload,dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL,token } = await company();
    const res = await fetch(`${BASE_URL}/fund-request?page=${payload?.page || 1}&limit=20&search=${payload?.serch || ""}&status=${payload?.status}`, {
     method: "GET",
     headers: {
         Authorization: `Bearer ${token}`,
      }     
     });
    const data = await res.json();
     
     if(data?.success === true){
      dispatch(setFundRequestList(data?.data))
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

export const updateFundRequestStatusApiCall = async (payload,id,dispatch) => {
  try {
    // const payload = {
    //   failureReason: "dsdsaasd",
    //   status: "REJECTED" , //SUCCESS
    // } 
    dispatch(setLoading(true))
    const { BASE_URL } = await company();
    const res = await fetch(`${BASE_URL}/fund-request/${id}/status`, {
     method: "PUT",
     body:JSON.stringify(payload),
     headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      }     
     });
    const data = await res.json();
    
     if(data?.success === true){
      // dispatch(setFundRequestList(data?.data))
       getFundRequestLsitApiCall(dispatch)
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




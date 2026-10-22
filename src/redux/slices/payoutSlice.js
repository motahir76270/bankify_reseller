import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import { createSlice } from "@reduxjs/toolkit";

const payoutSlice = createSlice({
  name: "payout",
  initialState: {
    transactionlist: [],
    userBankData:[],
    ministateListData:[],
    loading: false,
  },
  reducers: {
    setTransactionlist: (state, actions) => {
      state.transactionlist = actions.payload;
    },
    setUserBankData: (state, actions) => {
      state.userBankData = actions.payload;
    },
    setMinistateListData: (state, actions) => {
      state.ministateListData = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setTransactionlist,setUserBankData,setMinistateListData,setLoading} = payoutSlice.actions;

export default payoutSlice.reducer;

export const getPayoutTransactionlistDataApiCall = async (filter,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/payout/history?page=${filter?.page}&limit=20&status=${filter?.status}&search=${filter?.search || ""}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setTransactionlist(data?.data))
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

export const getUserBankDataApiCall = async (userId,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank/user/${userId}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setUserBankData(data?.data))
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

export const initiatePayoutApiCall = async (payload,dispatch) => {
  try {

    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/payout`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(payload);
    
     if(data?.success === true){
        const filtedata = ""
       getPayoutTransactionlistDataApiCall(filtedata,dispatch)
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

export const getMiniSateListDataApiCall = async (filterData,dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/payout/mini-statement?tranType=${filterData?.tranType}&fromDate=${filterData?.fromDate}&toDate=${filterData?.toDate}&serviceProviderMappingId=${filterData?.serviceProviderMappingId}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(filterData);
    
     if(data?.success === true){
      dispatch(setMinistateListData(data?.data))
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
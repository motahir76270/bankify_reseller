import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import { createSlice } from "@reduxjs/toolkit";

const banckSlice = createSlice({
  name: "banks",
  initialState: {
    bankList: [],
    mybankList: [],
    bankAcountReqList:[],
    loading: false,
  },
  reducers: {
    setBankList: (state, actions) => {
      state.bankList = actions.payload;
    },
     setMyBankList: (state, actions) => {
      state.mybankList = actions.payload;
    },
    setMyBankResquestList: (state, actions) => {
      state.bankRequestList = actions.payload;
    },
    setBankAcountReqList: (state, actions) => {
      state.bankAcountReqList = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setBankList,setMyBankList,setMyBankResquestList,setBankAcountReqList,setLoading} = banckSlice.actions;

export default banckSlice.reducer;

export const getBankListApiCall = async (dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json()
     if(data?.success === true){
      dispatch(setBankList(data?.data))
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

export const getVarifyBankAccount = async (payload,dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank-verification/penny-drop`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type": 'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json()
     if(data?.success === true){
       getMyBankListApiCall(dispatch)
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

export const getMyBankListApiCall = async (userId,dispatch) => {
    
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank/user/${userId}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json()
     if(data?.success === true){
      dispatch(setMyBankList(data?.data))
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

export const createBankAccountApiCall = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank/submit`, {
      method: "POST",
      body:JSON.stringify({bankDetail:payload}),
      headers: {
         "Content-Type": 'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json()
    // console.log(data);
    
     if(data?.success === true){
       getMyBankListApiCall(dispatch)
       showSuccess("Success", data?.message)
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

export const updateBankAccountApiCall = async (id,bankDetail,dispatch) => {
  try {
    const payload ={
        bankDetail:bankDetail,
        bankDetailId:id
    }
    
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank/edit`, {
      method: "PUT",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type": 'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json()
    
     if(data?.success === true){
       showSuccess("Success", data?.message)
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

export const deleteBankAccountApiCall = async (id,dispatch) => {
  try {

    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank/${id}`, {
      method: "DELETE",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json()
     if(data?.success === true){
       showSuccess("Success", data?.message)
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



//bank account pending aproval list;
export const getPendaingAprovalBankAccountListApiCall = async (filterPayload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank/list?page=${filterPayload?.page || 1}&limit=20&status=${filterPayload?.status || "ALL"}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json()
     if(data?.success === true){
      dispatch(setBankAcountReqList(data?.data))
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

export const udateStatusBankAccountApiCall = async (payload,status,dispatch) => {
  try {
    console.log(payload);
    
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank/${status}`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    console.log(data);
    
     if(data?.success === true){
      showSuccess("Success", data?.message)
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


import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { Alert } from "react-native";
import axios from "axios";

const historySlice = createSlice({
  name: "history",
  initialState: {
    transactionHistoryData: "",
    ledgerHistoryData:"",
    reportHistoryData:"",
    auditLogsData:""
  },
  reducers: {
    setTransactionHistory: (state, actions) => {
      state.transactionHistoryData = actions.payload;
    },
     setReportHistory: (state, actions) => {
      state.reportHistoryData = actions.payload;
    },
    setLedgerHistory: (state, actions) => {
      state.ledgerHistoryData = actions.payload;
    },
    setAuditLogData: (state, actions) => {
      state.auditLogsData = actions.payload;
    },
     setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setTransactionHistory,setReportHistory,setLedgerHistory,setAuditLogData,setLoading} = historySlice.actions;

export default historySlice.reducer;

export const getTransactionsHistoryDataApiCall = async (payload,dispatch) => {
  try {
  //  console.log(payload);
   
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/transactions/list?page=${payload.page}&limit=20&status=${payload?.status}&serviceType=${payload?.serviceType}&sortBy=initiatedAt&sortOrder=desc&${payload?.search ? "search="+ payload?.search: null}&${payload?.fromDate ? "fromDate=" + payload?.fromDate :null}&${payload?.toDate ? "toDate=" + payload?.toDate :null}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setTransactionHistory(data?.data))
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

export const getLedgerHistoryDataApiCall = async (payload,dispatch) => {
  try {
  
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/ledger/list?page=${payload.page}&limit=20&entryType=ALL&sortBy=createdAt&sortOrder=desc&${payload?.search ? "search="+ payload?.search: null}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setLedgerHistory(data?.data))
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

export const getReportHistoryDataApiCall = async (types,payload,dispatch) => {
  try {
    console.log(types);
    
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/report/${types}/list`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();  
    console.log(data);
    
     if(data?.success === true){
      dispatch(setReportHistory(data?.data))
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

export const getAuditLogsDataApiCall = async (payload,dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/audit-logs/list?page=${payload?.page || 1}&limit=20&entryType=ALL&sortBy=createdAt&sortOrder=desc`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    
    if(data?.success === true){
      //  console.log(data?.data);
      dispatch(setAuditLogData(data?.data))
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

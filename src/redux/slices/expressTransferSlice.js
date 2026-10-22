import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";

const expressTransferSlice = createSlice({
  name: "expressTransfer",
  initialState: {
    transactionlist: [],
    loginData:"",
    BankList:[],
    ETAccountDetials:"",
    beneficiaryData:[],
    loading: false,
  },
  reducers: {
    setTransactionlist: (state, actions) => {
      state.transactionlist = actions.payload;
    },
    setETAccountDetilas: (state, actions) => {
      state.ETAccountDetials = actions.payload;
    },
    setBankList: (state, actions) => {
      state.BankList = actions.payload;
    },
    setBeneficiaryData: (state, actions) => {
      state.beneficiaryData = actions.payload;
    }, 
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setTransactionlist,setETAccountDetilas,setBankList,setBeneficiaryData,setLoading} = expressTransferSlice.actions;

export default expressTransferSlice.reducer;

export const getQTtransactionlistDataApiCall = async (filter,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-transfer/history?page=${filter?.page}&limit=20&status=${filter?.status}&search=${filter?.search || ""}`, {
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

export const ExpressTransferLoginApiCall = async (payload,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-beneficiary-bank-detail?page=1&limit=3&search=${payload?.mobileNumber}&isActive=true`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      await AsyncStorage.setItem('mobile', JSON.stringify(payload));
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

export const createExpressTransferAccountApiCall = async (payload,dispatch) => {
  try {
   
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-beneficiary-bank-detail`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
       dispatch(setLoginData(payload))
       router.push('/screens/services/expressTransfer/page')
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

export const getExpressTranferDetailsApiCall = async (payload,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-beneficiary-bank-detail?page=1&limit=3&search=${payload?.mobileNumber}&isActive=true`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
     if(data?.success === true){
      dispatch(setETAccountDetilas(data?.data[0]));      
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


//beneficiery or bank account list
export const getBeneficiaryDataApiCall = async (payload,dispatch) => {
  try {
    
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-beneficiary-bank-detail?page=1&limit=3&search=${payload?.mobileNumber}&verificationStatus=VERIFIED&isActive=true`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json(); 
    
     if(data?.success === true){
      dispatch(setBeneficiaryData(data?.data));      
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

export const getBanksApiCall = async (dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
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

export const getVerifyBank =  async (payload,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/bank-verification/penny-drop`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
        "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log("dfhsgdf",data);
    
     if(data?.success === true){
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

export const createBeneficiaryApiCall = async (payload,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-beneficiary-bank-detail`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
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

export const updateBeneficiaryApiCall = async (payload,id,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-beneficiary-bank-detail/bank-account/${id}`, {
      method: "PUT",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();

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

export const deleteBeneficiaryApiCall = async (id,dispatch) => {
  try {
    // ?page=1&limit=10&status=ALL&search=
    console.log(id);
    
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-beneficiary-bank-detail/bank-account/${id}`, {
      method: "DELETE",
      headers: {
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


//initiate transfer api Express 
export const initiateTransferApiCall = async (payload,dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/express-transfer`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
         "Content-Type":"application/json",
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
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







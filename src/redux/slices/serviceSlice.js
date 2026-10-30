import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import { createSlice } from "@reduxjs/toolkit";

const servicesSlice = createSlice({
  name: "services",
  initialState: {
    dashboardData: "",
    serviceMapingId:[],
    permissionsData:[],
    loading: false,
  },
  reducers: {
    setDashBoard: (state, actions) => {
      state.dashboardData = actions.payload;
    },
    setServiceMapingId: (state, actions) => {
      state.serviceMapingId = actions.payload;
    },
    setPermissions: (state, actions) => {
      state.permissionsData = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setDashBoard,setServiceMapingId,setPermissions,setLoading} = servicesSlice.actions;

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

export const getPermissionDataApiCall = async (dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/permissions`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setPermissions(data?.data))
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


export const digilockerInitiateApiCall  = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/digilocker`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
        "Content-Type":'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
      console.log("initiate res", data);

     return data;
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};

export const verifyDigilockerCallbackApiCall  = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();

    const params = new URLSearchParams({
       refid: payload?.refId ?? "",
       serviceProviderMappingId: payload?.serviceProviderMappingId ?? ""
   });

   const res = await fetch(`${BASE_URL}/digilocker/callback?${params.toString()}`, {
      method: "GET",
      headers: {
      Authorization: `Bearer ${token}`,
     }
    });

     const data = await res.json();
      console.log("callback res", data);
      
     return data;
   } catch (error) {
      showError("Faled", error?.message || "server not respond")
   }finally{
     dispatch(setLoading(false));
   }
};











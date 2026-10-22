import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import { createSlice } from "@reduxjs/toolkit";


const DomainSlice = createSlice({
  name: "domain",
  initialState: {
    domainData: "",
    loading: false,     // ✅ add this
  },
  reducers: {
    setDomainData: (state, actions) => {
      state.domainData = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setDomainData,setLoading} = DomainSlice.actions;

export default DomainSlice.reducer;

export const getDomainDataApiCall = async (tenantId,dispatch) => {
  try {
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/tenant-domain/${tenantId}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setDomainData(data?.data))
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



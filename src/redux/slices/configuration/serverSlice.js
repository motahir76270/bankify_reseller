import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import { createSlice } from "@reduxjs/toolkit";


const smptSlice = createSlice({
  name: "smtp",
  initialState: {
    smptData: "",
    loading: false,     // ✅ add this
  },
  reducers: {
    setSmptData: (state, actions) => {
      state.smptData = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setSmptData,setLoading} = smptSlice.actions;

export default smptSlice.reducer;

export const getSMTPdataApiCall = async (dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/smtp-configs`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    console.log(data);
    
     if(data?.success === true){
      dispatch(setSmptData(data?.data))
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


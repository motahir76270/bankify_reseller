import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import { createSlice } from "@reduxjs/toolkit";

const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    walletHistoryData: [],
  },
  reducers: {
      setWalletHistory: (state, actions) => {
      state.walletHistoryData = actions.payload;
    },
     setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const { setWalletHistory ,setLoading} = walletSlice.actions;

export default walletSlice.reducer;

export const getWalletHistoryDataApiCall = async (payload,dispatch) => {
  try {
    
// https://tahir.azzunique.cloud/api/v1/wallet-to-wallet/history?page=1&limit=10&status=ALL&mode=ALL

    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/wallet-to-wallet/history?page=${payload?.page || 1}&limit=20&status=${payload?.status}&mode=${payload?.mode}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });
  //  console.log(payload);
   
    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setWalletHistory(data?.data))
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


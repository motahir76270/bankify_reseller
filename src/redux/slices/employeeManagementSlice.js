import { showError, showSuccess } from "@/components/service/AlertService";
import { company } from "@/constants/string";
import { createSlice } from "@reduxjs/toolkit";

const servicesSlice = createSlice({
  name: "employees",
  initialState: {
    emplyeeData:"",
    departmentData: "",
    permissionsData:""
  },
  reducers: {
    setEmployeesData: (state, actions) => {
      state.emplyeeData = actions.payload;
    },
    setDepartment: (state, actions) => {
      state.departmentData = actions.payload;
    },
    setPermissionsData: (state, actions) => {
      state.permissionsData = actions.payload;
    },
    setLoading: (state, actions) => {
      state.loading = actions.payload;
    },
  },
});

export const {setEmployeesData, setDepartment,setPermissionsData,setLoading} = servicesSlice.actions;

export default servicesSlice.reducer;

export const getDepartmentDataApiCall = async (dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/departments`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    
     if(data?.success === true){
      dispatch(setDepartment(data?.data))
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

export const createDepartmentApiCall = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/departments`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
        'Content-Type':'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setDepartment(data?.data))
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

export const updateDepartmentApiCall = async (id,payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/departments/${id}`, {
      method: "PUT",
      body:JSON.stringify(payload),
      headers: {
        'Content-Type':'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setDepartment(data?.data))
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

export const deleteDepartmentApiCall = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/departments`, {
      method: "DELETE",
      body:JSON.stringify(payload),
      headers: {
        'Content-Type':'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      dispatch(setDepartment(data?.data))
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

export const getEmployeesPermissionsApiCall = async (dispatch) => {
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
      dispatch(setPermissionsData(data?.data))
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

export const updateDepartmentPermissionApiCall = async (payload,id,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/departments/${id}/permissions`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
        'Content-Type':'application/json',
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



// Emplyees Crud Operation
export const getEmployeesListApiCall = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/employees?page=${payload?.page || 1}&limit=10&search=${payload?.search}&status=${payload?.status}&fromDate=${payload?.fromDate}&toDate=${payload?.toDate}`, {
      method: "GET",
      headers: {
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();

     if(data?.success === true){
      dispatch(setEmployeesData(data?.data))
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

export const createEmployeesApiCall = async (payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/employees`, {
      method: "POST",
      body:JSON.stringify(payload),
      headers: {
        'Content-Type':'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
      await getEmployeesListApiCall(dispatch)
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

export const updateEmployeesApiCall = async (id,payload,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/employees/${id}`, {
      method: "PUT",
      body:JSON.stringify(payload),
      headers: {
        'Content-Type':'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
            await getEmployeesListApiCall(dispatch)
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

export const deleteEmployeesApiCall = async (id,dispatch) => {
  try {
    // dashboard?fromDate=2026-10-08&toDate=
    dispatch(setLoading(true))
    const { BASE_URL ,token} = await company();
    const res = await fetch(`${BASE_URL}/employees/${id}`, {
      method: "DELETE",
      body:JSON.stringify(payload),
      headers: {
        'Content-Type':'application/json',
         Authorization: `Bearer ${token}`,
      },
     });

    const data = await res.json();
    // console.log(data);
    
     if(data?.success === true){
        await getEmployeesListApiCall(dispatch)
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

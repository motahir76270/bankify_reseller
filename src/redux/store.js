import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import addFundReducer from "./slices/addFundSlice";
import profileKycReducer from './slices/profileKycSlice'
import servicesReducer from './slices/serviceSlice'
import usersReducer from './slices/userMangementSlice'
import historyReducer from './slices/historySlice'
import emplyeesReducer from './slices/employeeManagementSlice'
import walletReducer from './slices/walletSlice'
import smtpReducer from './slices/configuration/smptSlice'
import domainReducer from './slices/configuration/domainSlice'
import banksReducer from './slices/bankAccountSlice'
import commissionReducer from './slices/comissionSlice'
import expressTransferReducer from './slices/expressTransferSlice'
import payoutReducer from './slices/payoutSlice'


export const store = configureStore({
  reducer: {
    auth: authReducer,
    profileKyc:profileKycReducer,
    services: servicesReducer,
    users: usersReducer,
    history: historyReducer,
    employees: emplyeesReducer,
    wallet: walletReducer,
    smtp: smtpReducer,
    domain: domainReducer,
    banks: banksReducer,
    commission: commissionReducer,
    addFund: addFundReducer,
    expressTransfer: expressTransferReducer,
    payout: payoutReducer,
  },
});

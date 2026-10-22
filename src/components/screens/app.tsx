import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const AppScreens = () => {
  return (
     <Stack initialRouteName='(auth)' screenOptions={{headerShown:false}}>
        <Stack.Screen name='(auth)' />
        <Stack.Screen name='(tabs)' />

        <Stack.Screen name='screens/config/server' />
        <Stack.Screen name='screens/config/smtp' />
        <Stack.Screen name='screens/config/domain' />
       
        <Stack.Screen name='screens/services/payout/payout' />
        <Stack.Screen name='screens/services/payout/ministate' />
        <Stack.Screen name='screens/services/fundRequest' />
        <Stack.Screen name='screens/services/expressTransfer/ETHistory' />
        <Stack.Screen name='screens/services/expressTransfer/page' />


        <Stack.Screen name='screens/administration/auditLogs' />
        <Stack.Screen name='screens/administration/ledger' />
        <Stack.Screen name='screens/administration/reports/reportTypes' />
        <Stack.Screen name='screens/administration/reports/[id]' />
        <Stack.Screen name='screens/administration/banks/myBanks' />
        <Stack.Screen name='screens/administration/banks/pendingAprovals' />
        <Stack.Screen name='screens/administration/kyc/myKyc' />
        <Stack.Screen name='screens/administration/kyc/kycRequests' />

        <Stack.Screen name='screens/administration/commission/rules' />
        <Stack.Screen name='screens/administration/commission/applicable' />


        <Stack.Screen name='screens/profileKyc' />
        <Stack.Screen name='screens/changePassword' />

        <Stack.Screen name='screens/users/users' />
        <Stack.Screen name='screens/users/role' />

        <Stack.Screen name='screens/employees/employees' />
        <Stack.Screen name='screens/employees/department' />
  
    </Stack>
  )
}

export default AppScreens
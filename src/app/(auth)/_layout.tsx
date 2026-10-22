import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const RootLayout = () => {
  return (
    <Stack initialRouteName='initial' screenOptions={{headerShown:false}}>
        <Stack.Screen name='login' />
        <Stack.Screen name='pin' />
        <Stack.Screen name='register' />
        <Stack.Screen name='initial' />
    </Stack>
  )
}

export default RootLayout
import { View, Text } from 'react-native'
import React from 'react'
import { getServiceMapingIdDataApiCall } from '@/redux/slices/serviceSlice'

const MiniStateModal = ({visible,onClose}:any) => {

    // getServiceMapingIdDataApiCall(dispatch)
  return (
    <View>
      <Text>MiniStateModal</Text>
    </View>
  )
}

export default MiniStateModal
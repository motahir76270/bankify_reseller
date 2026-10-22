// import { View, Text, ScrollView, RefreshControl, StyleSheet, useColorScheme } from 'react-native';
// import React, { useCallback, useEffect, useState } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { router } from 'expo-router';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { getMeApiCall } from '@/redux/slices/authSlice';
// import { checkFundStatusApiCall } from '@/redux/slices/addFundSlice';
// import { Colors } from '@/constants/theme';
// import AddFundModal from '@/components/modal/addFund/minFundFormModal';
// import PendingStatusModal from '@/components/modal/addFund/pendingFundModal';
// import KycAlertModal from '@/components/modal/profileKyc/kycAlertModal';
// import { PrevioutKycApiCall } from '@/redux/slices/profileKycSlice';

// const HomeScreen = () => {
//   const { user } = useSelector((state: any) => state.auth);
//   const id = user?.user?.id
  
//   const scheme = useColorScheme();
//   const isDark = scheme === 'dark';
//   const colors = Colors[isDark ? 'dark' : 'light'];

//   const [addFundVisible, setAddFundVisible] = useState(false);
//   const [pendingModalVisible, setPendingModalVisible] = useState(false);
//   const [profileKycModalVisible, setProfileKycModalVisible] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);

//   const dispatch = useDispatch();

//   const fetchData = useCallback(
//     async (isRefresh = false) => {
//       try {
//         const storedUser = await AsyncStorage.getItem('user');
//         if (!storedUser) {
//           if (!isRefresh) router.replace('/(auth)/login');
//           return;
//         }

//         const res = await getMeApiCall(dispatch);
//         const fundRes = await checkFundStatusApiCall(dispatch);
          
//         const statusFundReq = fundRes.at(0) ;
        
//         if (res?.wallet?.balance === 0 && res?.user?.isKycVerified === false && (statusFundReq?.status === "REJECTED" && statusFundReq?.status !== "PENDING") ) {
//           setAddFundVisible(true);
//         } else {
//           // 👇 show pending modal based on API response
//           if (res?.wallet?.balance === 0 && (statusFundReq?.status === "REJECTED" || statusFundReq?.status === "PENDING") && res?.user?.isKycVerified === false) {
//             setPendingModalVisible(true);
//           }else if(res?.user?.isKycVerified === true){
            
//           }else{
//             await  PrevioutKycApiCall(id,dispatch)
//              setProfileKycModalVisible(true)
//           }
//         }
//       } catch (error) {
//         console.log('Error fetching user:', error);
//       }
//     },
//     [dispatch,id],
//   );

//   useEffect(() => {
//     fetchData(false);
//   }, [fetchData,pendingModalVisible,addFundVisible,profileKycModalVisible]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     try {
//       await fetchData(true);
//     } finally {
//       setRefreshing(false);
//     }
//   }, [fetchData]);

//   const handleAddFundSubmit = async (values: {
//     amount: number;
//     paymentMode: string;
//     providerTxnId: string;
//     imageUrl?: any;
//   }) => {
//     try {
//       setSubmitting(true);
//       // TODO: call your addFund API here
//       // const res = await addFundApiCall(dispatch, values);

//       setAddFundVisible(false);
//       setPendingModalVisible(true); // show pending right after submit
//     } catch (e) {
//       console.log('Add fund error:', e);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <View style={{ flex: 1, backgroundColor: colors.background }}>
//       <ScrollView
//         contentContainerStyle={styles.content}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor={colors.buttonPrimary}
//             colors={[colors.buttonPrimary]}
//           />
//         }
//       >
//         <Text style={{ color: colors.text }}>index</Text>
//       </ScrollView>

//       {/* Add Fund Modal */}
//       <AddFundModal
//         visible={addFundVisible}
//         onClose={() => setAddFundVisible(false)}
//         loading={submitting}
//       />

//       <KycAlertModal
//         visible={profileKycModalVisible}
//         onClose={() => setProfileKycModalVisible(false)}
//       />

//       {/* Pending Status Modal */}
//       <PendingStatusModal
//         visible={pendingModalVisible}
//         onClose={() => setPendingModalVisible(false)}
//         onContactSupport={() => {
//           setPendingModalVisible(false);
//         }}
//         addFundVisible={addFundVisible}
//         setAddFundVisible={setAddFundVisible}
//       />
//     </View>
//   );
// };

// export default HomeScreen;

// const styles = StyleSheet.create({
//   content: { flexGrow: 1, padding: 16 },
// });
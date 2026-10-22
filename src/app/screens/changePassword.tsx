import { Text, useColorScheme, StyleSheet, View, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthValiation from '@/validations/auth';
import { useDispatch, useSelector } from 'react-redux';

import { FullScreenLoader } from '@/hooks/use-screensLoder';
import HeaderSection from '@/components/ui/headerSections';
import { changePasswordApiCall } from '@/redux/slices/authSlice';
import { LinearGradient } from 'expo-linear-gradient';


type PasswordFormData = z.infer<typeof AuthValiation.changePasswordSchema>;

const ChangePasswordScreen = () => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const dispatch = useDispatch()
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<PasswordFormData>({
    resolver: zodResolver(AuthValiation.changePasswordSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const newPassword = watch('newPassword');

  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) strength++;
    return strength;
  };

  const getStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength <= 2) return colors.error;
    if (strength <= 3) return colors.warning;
    return colors.success;
  };

  const getStrengthText = () => {
    const strength = getPasswordStrength();
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Medium';
    if (strength <= 4) return 'Strong';
    return 'Very Strong';
  };

  const onSubmit = async (data: PasswordFormData) => {
      const payload= {
        newPassword:data?.newPassword,
        oldPassword:data?.oldPassword
      }

      const res =  await changePasswordApiCall(payload,dispatch)
      if(res?.success === true){
        reset();
      }
  };


  return (
    <LinearGradient
     colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
       style={styles.container}>
      <HeaderSection title="Change Password" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
  
        <View style={[styles.formContainer, { backgroundColor: colors.card }]}>
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Current Password</Text>
            <Controller
              control={control}
              name="oldPassword"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputWrapper, { borderColor: errors.oldPassword ? colors.error : colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showCurrentPassword}
                    value={value}
                    onChangeText={onChange}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                    <Ionicons 
                      name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.oldPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.oldPassword.message}</Text>
            )}
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>New Password</Text>
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, value } }) => (
                <>
                  <View style={[styles.inputWrapper, { borderColor: errors.newPassword ? colors.error : colors.border }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showNewPassword}
                      value={value}
                      onChangeText={onChange}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                      <Ionicons 
                        name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Password Strength Indicator */}
                  {value && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBarContainer}>
                        <View style={[styles.strengthBar, { width: `${(getPasswordStrength() / 5) * 100}%`, backgroundColor: getStrengthColor() }]} />
                      </View>
                      <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                        Password Strength: {getStrengthText()}
                      </Text>
                    </View>
                  )}
                </>
              )}
            />
            {errors.newPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.newPassword.message}</Text>
            )}
          </View>

          {/* Confirm New Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Confirm New Password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputWrapper, { borderColor: errors.confirmPassword ? colors.error : colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                    value={value}
                    onChangeText={onChange}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.confirmPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.confirmPassword.message}</Text>
            )}
          </View>

          {/* Password Requirements */}
          <View style={[styles.requirementsContainer, { backgroundColor: colors.card,borderColor:colors.border }]}>
            <Text style={[styles.requirementsTitle, { color: colors.textSecondary }]}>Password Requirements:</Text>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={newPassword && newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={newPassword && newPassword.length >= 8 ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>At least 8 characters</Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={newPassword && /[A-Z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={newPassword && /[A-Z]/.test(newPassword) ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>At least one uppercase letter</Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={newPassword && /[a-z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={newPassword && /[a-z]/.test(newPassword) ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>At least one lowercase letter</Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={newPassword && /[0-9]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={newPassword && /[0-9]/.test(newPassword) ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>At least one number</Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={newPassword && /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={newPassword && /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>At least one special character</Text>
            </View>
          </View>

          {/* Update Button */}
          <TouchableOpacity 
            style={[styles.updateButton, { backgroundColor: colors.buttonPrimary }]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
                <Text style={styles.updateButtonText}>Updating</Text>
            ) : (
              <Text style={styles.updateButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <FullScreenLoader loading={loading} />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 12,
    lineHeight: 18,
  },
  formContainer: {
    padding: 20,
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    marginLeft: 10,
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    marginTop: 5,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
  },
  requirementsContainer: {
    marginTop: 10,
    marginBottom: 20,
    padding: 12,
    borderWidth:1,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  requirementText: {
    fontSize: 12,
    marginLeft: 8,
  },
  updateButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChangePasswordScreen;
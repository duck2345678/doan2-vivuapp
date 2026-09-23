/**
 * AddFriendScreen Component
 * Screen for adding friends via QR code or phone number
 * Matches Figma node 496:680
 */
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

// Mock current user ID - in real app, get from auth store
const CURRENT_USER_ID = 'user-quynh-123';
const CURRENT_USER_NAME = 'Quynh';

/**
 * Add Friend screen with QR code and phone input
 */
export function AddFriendScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [phoneNumber, setPhoneNumber] = useState('');

  const handleBack = () => {
    router.back();
  };

  const handleSubmitPhone = () => {
    if (phoneNumber.trim().length > 0) {
      // TODO: Implement phone number friend request
      console.log('Add friend by phone:', phoneNumber);
    }
  };

  const handleScanQR = () => {
    router.push('/profile/qr-scan');
  };

  const handleViewSentRequests = () => {
    // TODO: Navigate to sent friend requests
    console.log('View sent friend requests');
  };

  // Generate QR value from user ID
  const qrValue = `univillage://add-friend/${CURRENT_USER_ID}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#2b7fff', '#155dfc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Kết bạn</Text>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* QR Code Card */}
        <View style={[styles.qrCard, Shadows.card]}>
          <LinearGradient
            colors={['#eff6ff', '#eef2ff']}
            style={styles.qrCardInner}
          >
            {/* User Name */}
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {CURRENT_USER_NAME}
            </Text>

            {/* QR Code Container */}
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={qrValue}
                size={190}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
              {/* Checkmark overlay */}
              <View style={styles.qrCheckmark}>
                <Ionicons name="checkmark-circle" size={32} color={colors.fabBlue} />
              </View>
            </View>

            {/* Helper text */}
            <Text style={[styles.qrHelperText, { color: colors.textSecondary }]}>
              Scan this to add me
            </Text>
          </LinearGradient>
        </View>

        {/* Phone Input Section */}
        <View style={styles.phoneSection}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            Thêm bạn qua số điện thoại
          </Text>
          <View style={styles.phoneInputRow}>
            <TextInput
              style={[
                styles.phoneInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.borderLight,
                  color: colors.text,
                },
              ]}
              placeholder="Nhập số điện thoại"
              placeholderTextColor={colors.textSecondary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TouchableOpacity
              style={[
                styles.phoneSubmitButton,
                { backgroundColor: colors.fabBlue },
              ]}
              onPress={handleSubmitPhone}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scan QR Button */}
        <TouchableOpacity
          style={styles.scanQRButton}
          onPress={handleScanQR}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#eff6ff', '#eef2ff']}
            style={styles.scanQRGradient}
          >
            <View
              style={[
                styles.scanQRIconContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color={colors.fabBlue} />
            </View>
            <View style={styles.scanQRTextContainer}>
              <Text style={[styles.scanQRTitle, { color: colors.textPrimary }]}>
                Quét mã QR
              </Text>
              <Text style={[styles.scanQRSubtitle, { color: colors.textSecondary }]}>
                Quét mã để kết bạn nhanh
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* View Sent Requests Link */}
        <TouchableOpacity
          style={styles.sentRequestsLink}
          onPress={handleViewSentRequests}
        >
          <Text style={[styles.sentRequestsText, { color: colors.fabBlue }]}>
            Xem lời mời kết bạn đã gửi
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: '#FFFFFF',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  },
  qrCard: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  qrCardInner: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  userName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.md,
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    position: 'relative',
  },
  qrCheckmark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  qrHelperText: {
    fontSize: Typography.sizes.md,
    marginTop: Spacing.md,
  },
  phoneSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.sm,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  phoneInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  phoneSubmitButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanQRButton: {
    marginBottom: Spacing.xl,
  },
  scanQRGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#bedbff',
  },
  scanQRIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  scanQRTextContainer: {
    flex: 1,
  },
  scanQRTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  scanQRSubtitle: {
    fontSize: 13,
  },
  sentRequestsLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  sentRequestsText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});

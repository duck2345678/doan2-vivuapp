/**
 * StepIndicator Component
 * Progress indicator for multi-step flows
 * Matches Figma node 499:1460 and 499:1729
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Typography } from '@/shared/constants';
import { useColorScheme } from '@/shared/hooks';

interface StepIndicatorProps {
  currentStep: 1 | 2;
  totalSteps?: 2;
}

/**
 * Two-step progress indicator with numbered circles and connector line
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const isStep1Active = currentStep >= 1;
  const isStep2Active = currentStep >= 2;

  return (
    <View style={styles.container}>
      {/* Step 1 Circle */}
      <View
        style={[
          styles.stepCircle,
          isStep1Active
            ? { backgroundColor: colors.fabBlue }
            : { backgroundColor: '#e5e7eb' },
        ]}
      >
        <Text
          style={[
            styles.stepNumber,
            isStep1Active
              ? { color: '#FFFFFF' }
              : { color: colors.textSecondary },
          ]}
        >
          1
        </Text>
      </View>

      {/* Connector Line */}
      <View
        style={[
          styles.connector,
          {
            backgroundColor: isStep2Active ? colors.fabBlue : '#e5e7eb',
          },
        ]}
      />

      {/* Step 2 Circle */}
      <View
        style={[
          styles.stepCircle,
          isStep2Active
            ? { backgroundColor: colors.fabBlue }
            : { backgroundColor: '#e5e7eb' },
        ]}
      >
        <Text
          style={[
            styles.stepNumber,
            isStep2Active
              ? { color: '#FFFFFF' }
              : { color: colors.textSecondary },
          ]}
        >
          2
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  connector: {
    flex: 1,
    height: 4,
    marginHorizontal: 8,
    maxWidth: 200,
  },
});

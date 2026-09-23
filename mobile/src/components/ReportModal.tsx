/**
 * Report Modal Component
 *
 * Modal for selecting report reason and submitting a report.
 * Supports reporting posts, comments, users, and conversations.
 */

import {
  REPORT_REASON_OPTIONS,
  ReportReason,
} from "@/shared/types/report.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  targetType: "post" | "comment" | "user" | "conversation";
  isLoading?: boolean;
}

export function ReportModal({
  visible,
  onClose,
  onSubmit,
  targetType,
  isLoading = false,
}: ReportModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [customReason, setCustomReason] = useState("");

  const handleSubmit = () => {
    if (!selectedReason) return;

    const reason =
      selectedReason === ReportReason.OTHER && customReason.trim()
        ? customReason.trim()
        : selectedReason;

    onSubmit(reason);
  };

  const handleClose = () => {
    setSelectedReason(null);
    setCustomReason("");
    onClose();
  };

  const canSubmit =
    selectedReason &&
    (selectedReason !== ReportReason.OTHER || customReason.trim().length > 0);

  const getTitle = () => {
    switch (targetType) {
      case "post":
        return "Báo cáo bài viết";
      case "comment":
        return "Báo cáo bình luận";
      case "user":
        return "Báo cáo người dùng";
      case "conversation":
        return "Báo cáo cuộc trò chuyện";
      default:
        return "Báo cáo";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{getTitle()}</Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isLoading}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.subtitle}>Vui lòng chọn lý do báo cáo:</Text>

              {/* Report Reason Options */}
              {REPORT_REASON_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.reasonOption,
                    selectedReason === option.value &&
                      styles.reasonOptionSelected,
                  ]}
                  onPress={() => setSelectedReason(option.value)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View style={styles.reasonOptionContent}>
                    <View style={styles.reasonHeader}>
                      <Text
                        style={[
                          styles.reasonLabel,
                          selectedReason === option.value &&
                            styles.reasonLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {selectedReason === option.value && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#007AFF"
                        />
                      )}
                    </View>
                    {option.description && (
                      <Text style={styles.reasonDescription}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Custom Reason Input */}
              {selectedReason === ReportReason.OTHER && (
                <View style={styles.customReasonContainer}>
                  <Text style={styles.customReasonLabel}>
                    Chi tiết lý do báo cáo:
                  </Text>
                  <TextInput
                    style={styles.customReasonInput}
                    placeholder="Nhập lý do của bạn..."
                    placeholderTextColor="#999"
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    editable={!isLoading}
                    textAlignVertical="top"
                  />
                  <Text style={styles.characterCount}>
                    {customReason.length}/500
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (!canSubmit || isLoading) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "70%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 16,
    fontWeight: "500",
  },
  reasonOption: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  reasonOptionSelected: {
    borderColor: "#007AFF",
    borderWidth: 2,
    backgroundColor: "#F0F8FF",
  },
  reasonOptionContent: {
    gap: 6,
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  reasonLabelSelected: {
    color: "#007AFF",
  },
  reasonDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    lineHeight: 18,
  },
  customReasonContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  customReasonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 10,
  },
  customReasonInput: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#000",
    minHeight: 120,
    backgroundColor: "#fff",
  },
  characterCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 6,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#007AFF",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

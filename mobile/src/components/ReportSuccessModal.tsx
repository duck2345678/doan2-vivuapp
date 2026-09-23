import { Colors } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ReportSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: "post" | "comment" | "user" | "conversation";
}

export function ReportSuccessModal({
  visible,
  onClose,
  targetType,
}: ReportSuccessModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const getTargetText = () => {
    switch (targetType) {
      case "post":
        return "bài viết";
      case "comment":
        return "bình luận";
      case "user":
        return "người dùng";
      case "conversation":
        return "cuộc trò chuyện";
      default:
        return "nội dung";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* Success Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.success + "20" },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={colors.success}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            Báo cáo thành công
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Cảm ơn bạn đã báo cáo {getTargetText()} này. Chúng tôi sẽ xem xét và
            xử lý trong thời gian sớm nhất.
          </Text>

          {/* Additional Info */}
          {targetType === "post" && (
            <Text
              style={[styles.additionalInfo, { color: colors.textSecondary }]}
            >
              {getTargetText().charAt(0).toUpperCase() +
                getTargetText().slice(1)}{" "}
              này sẽ được ẩn khỏi feed của bạn.
            </Text>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 12,
  },
  additionalInfo: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 24,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

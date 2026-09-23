import { Colors } from "@/shared/constants";
import { useColorScheme } from "@/shared/hooks";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SaveSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  isSaved: boolean;
}

export function SaveSuccessModal({
  visible,
  onClose,
  isSaved,
}: SaveSuccessModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

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
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={64}
              color={colors.success}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isSaved ? "Đã lưu bài viết" : "Đã bỏ lưu bài viết"}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {isSaved
              ? "Bài viết đã được thêm vào danh sách đã lưu. Bạn có thể xem lại trong phần Đã lưu ở trang cá nhân."
              : "Bài viết đã được xóa khỏi danh sách đã lưu của bạn."}
          </Text>

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

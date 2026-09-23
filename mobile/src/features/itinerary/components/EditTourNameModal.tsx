import { Colors } from "@/shared";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

interface EditTourNameModalProps {
  visible: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
  isDark?: boolean;
}

export function EditTourNameModal({
  visible,
  currentName,
  onClose,
  onSave,
  isDark = false,
}: EditTourNameModalProps) {
  const colors = Colors[isDark ? "dark" : "light"];
  const [tourName, setTourName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!tourName.trim()) {
      setError("Tên chuyến đi không được trống");
      return;
    }

    if (tourName.trim() === currentName) {
      onClose();
      return;
    }

    if (tourName.length > 200) {
      setError("Tên chuyến đi tối đa 200 ký tự");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(tourName.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTourName(currentName);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Đổi tên chuyến đi
            </Text>
            <Pressable onPress={handleClose} disabled={isLoading}>
              <Ionicons
                name="close"
                size={24}
                color={isLoading ? colors.border : colors.icon}
              />
            </Pressable>
          </View>

          {/* Input */}
          <TextInput
            value={tourName}
            onChangeText={(text) => {
              setTourName(text);
              if (error) setError(null);
            }}
            placeholder="Nhập tên chuyến đi mới"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: error ? "#FF3B30" : colors.border,
                backgroundColor: colors.background,
              },
            ]}
            maxLength={200}
            editable={!isLoading}
          />

          {/* Character count */}
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {tourName.length}/200
          </Text>

          {/* Error message */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Buttons */}
          <View style={styles.buttonGroup}>
            <Pressable
              style={[styles.button, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Hủy
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: colors.info }]}
              onPress={handleSave}
              disabled={isLoading || tourName.trim() === currentName}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: "#fff" }]}>
                  Lưu
                </Text>
              )}
            </Pressable>
          </View>
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
    paddingHorizontal: 20,
  },
  container: {
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 350,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    fontSize: 14,
  },
  charCount: {
    fontSize: 12,
    marginBottom: 12,
    textAlign: "right",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 13,
    marginBottom: 12,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

type Option = { label: string; value: string };

type Props = {
  value?: string;
  options: readonly string[] | Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
};

const normalize = (opts: readonly string[] | Option[]): Option[] =>
  (opts as any[]).map((o) =>
    typeof o === "string" ? { label: o, value: o } : o,
  );

const Dropdown: React.FC<Props> = ({
  value,
  options,
  placeholder = "Select…",
  onChange,
  error,
  label,
}) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const [open, setOpen] = useState(false);

  const opts = normalize(options);
  const selected = opts.find((o) => o.value === value);

  return (
    <View>
      {!!label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surfacePrimary,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selected ? colors.text : colors.textMuted },
          ]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {!!error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <ScrollView>
              {opts.map((o) => {
                const active = o.value === value;
                return (
                  <TouchableOpacity
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={styles.option}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: active ? colors.buttonPrimary : colors.text,
                        },
                      ]}
                    >
                      {o.label}
                    </Text>
                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.buttonPrimary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default Dropdown;

const styles = StyleSheet.create({
  label: { fontSize: 12.5, fontWeight: "700", marginBottom: 6 },
  trigger: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: { fontSize: 14, fontWeight: "500" },
  errorText: { fontSize: 11.5, fontWeight: "600", marginTop: 4 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    maxHeight: 320,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: { fontSize: 14.5, fontWeight: "600" },
});
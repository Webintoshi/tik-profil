import { Search, X } from "lucide-react-native";
import { Pressable, TextInput, View } from "react-native";
import { tokens } from "@/theme/tokens";

interface SearchFieldProps {
  value: string;
  placeholder: string;
  onChangeText?: (value: string) => void;
  onPress?: () => void;
  editable?: boolean;
}

export function SearchField({
  value,
  placeholder,
  onChangeText,
  onPress,
  editable = true,
}: SearchFieldProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={{
        borderRadius: tokens.radius.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: tokens.colors.border,
        backgroundColor: tokens.colors.surface,
      }}
    >
      <View
        style={{
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: tokens.spacing.md,
        }}
      >
        <Search color={tokens.colors.textSoft} size={18} />
        <TextInput
          editable={editable}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.colors.textSoft}
          style={{
            flex: 1,
            color: tokens.colors.text,
            fontSize: 15,
          }}
          value={value}
        />
        {editable && value ? (
          <Pressable onPress={() => onChangeText?.("")}>
            <X color={tokens.colors.textSoft} size={18} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

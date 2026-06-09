import { View } from "react-native";

interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 48 }: BrandMarkProps) {
  const unit = Math.round(size / 3.2);
  const gap = Math.max(4, Math.round(size * 0.06));

  return (
    <View
      style={{
        width: size,
        gap,
      }}
    >
      <View style={{ flexDirection: "row", gap }}>
        {[0, 1, 2].map((index) => (
          <View
            key={`top-${index}`}
            style={{
              width: unit,
              height: unit,
              borderRadius: Math.round(unit * 0.3),
              backgroundColor: "#FFFFFF",
            }}
          />
        ))}
      </View>
      <View
        style={{
          alignItems: "center",
          gap,
        }}
      >
        {[0, 1].map((index) => (
          <View
            key={`mid-${index}`}
            style={{
              width: unit,
              height: unit,
              borderRadius: Math.round(unit * 0.3),
              backgroundColor: "#FFFFFF",
            }}
          />
        ))}
      </View>
    </View>
  );
}

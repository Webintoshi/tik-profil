import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

type IconName =
  | "apple"
  | "briefcase"
  | "campaign"
  | "chevron"
  | "compass"
  | "google"
  | "heart"
  | "home"
  | "mapPin"
  | "phone"
  | "profile"
  | "qr"
  | "search"
  | "spark";

interface IconProps {
  name: IconName;
  color?: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, color = "currentColor", size = 22, strokeWidth = 2.2 }: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none"
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {name === "home" && <Path {...common} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />}
      {name === "search" && (
        <>
          <Circle {...common} cx="10.5" cy="10.5" r="6.5" />
          <Line {...common} x1="16" y1="16" x2="21" y2="21" />
        </>
      )}
      {name === "heart" && <Path {...common} d="M20.5 8.8c0 5.1-8.5 9.7-8.5 9.7S3.5 13.9 3.5 8.8A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 1.8Z" />}
      {name === "profile" && (
        <>
          <Circle {...common} cx="12" cy="8" r="4" />
          <Path {...common} d="M4.5 20c1.5-4 4.2-6 7.5-6s6 2 7.5 6" />
        </>
      )}
      {name === "phone" && <Path {...common} d="M7.2 4.5 9.4 4l1.7 4-1.5 1.2a11 11 0 0 0 5.2 5.2l1.2-1.5 4 1.7-.5 2.2c-.2 1-1.1 1.7-2.1 1.7A14.9 14.9 0 0 1 5.5 6.6c0-1 .7-1.9 1.7-2.1Z" />}
      {name === "mapPin" && (
        <>
          <Path {...common} d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
          <Circle {...common} cx="12" cy="10" r="2.5" />
        </>
      )}
      {name === "campaign" && <Path {...common} d="M4 12h3l9-5v10l-9-5H4Zm3 0 2 6h3l-2.2-5.1" />}
      {name === "qr" && (
        <>
          <Rect {...common} x="4" y="4" width="6" height="6" rx="1" />
          <Rect {...common} x="14" y="4" width="6" height="6" rx="1" />
          <Rect {...common} x="4" y="14" width="6" height="6" rx="1" />
          <Path {...common} d="M14 14h2v2h-2Zm4 0h2v6h-6v-2h4Z" />
        </>
      )}
      {name === "briefcase" && (
        <>
          <Rect {...common} x="4" y="8" width="16" height="12" rx="2" />
          <Path {...common} d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16" />
        </>
      )}
      {name === "compass" && (
        <>
          <Circle {...common} cx="12" cy="12" r="9" />
          <Path {...common} d="m15.5 8.5-2.3 5.2-5.2 2.3 2.3-5.2 5.2-2.3Z" />
        </>
      )}
      {name === "spark" && <Path {...common} d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Zm6 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />}
      {name === "chevron" && <Path {...common} d="m9 6 6 6-6 6" />}
      {name === "google" && (
        <>
          <Path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7Z" fill="#4285F4" />
          <Path d="M12 21c2.6 0 4.8-.8 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9a5.6 5.6 0 0 1-5.3-3.9H3.5v2.5A9.5 9.5 0 0 0 12 21Z" fill="#34A853" />
          <Path d="M6.7 13.3a5.7 5.7 0 0 1 0-3.6V7.2H3.5a9.5 9.5 0 0 0 0 8.6l3.2-2.5Z" fill="#FBBC05" />
          <Path d="M12 6.8c1.4 0 2.7.5 3.7 1.5l2.8-2.8A9.4 9.4 0 0 0 12 3 9.5 9.5 0 0 0 3.5 7.2l3.2 2.5A5.6 5.6 0 0 1 12 6.8Z" fill="#EA4335" />
        </>
      )}
      {name === "apple" && <Path fill={color} d="M16.5 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.3.7-2.9.7-.6 0-1.5-.7-2.5-.7-1.3 0-2.5.8-3.2 1.9-1.4 2.4-.4 5.9 1 7.8.7.9 1.5 2 2.5 2s1.4-.6 2.6-.6 1.6.6 2.6.6 1.8-1 2.5-1.9c.8-1.1 1.1-2.2 1.1-2.3 0 0-2.5-1-2.5-3.8ZM14.6 6.7c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.6 1 0 1.9-.5 2.5-1.2Z" />}
    </Svg>
  );
}

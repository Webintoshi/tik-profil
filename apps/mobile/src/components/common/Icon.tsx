import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

export type IconName =
  | "apple"
  | "arrowLeft"
  | "bell"
  | "briefcase"
  | "campaign"
  | "chevron"
  | "chevronDown"
  | "clock"
  | "compass"
  | "filter"
  | "google"
  | "heart"
  | "heartFill"
  | "home"
  | "lock"
  | "location"
  | "mail"
  | "mapPin"
  | "menu"
  | "minus"
  | "moon"
  | "phone"
  | "plus"
  | "profile"
  | "qr"
  | "search"
  | "spark"
  | "star"
  | "store"
  | "sun"
  | "ticket"
  | "tikMark"
  | "trash"
  | "instagram"
  | "utensils"
  | "verified"
  | "whatsapp"
  | "x";

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
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" && <Path {...common} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />}
      {name === "search" && (
        <>
          <Circle {...common} cx="10.5" cy="10.5" r="6.5" />
          <Line {...common} x1="16" y1="16" x2="21" y2="21" />
        </>
      )}
      {name === "heart" && <Path {...common} d="M20.5 8.8c0 5.1-8.5 9.7-8.5 9.7S3.5 13.9 3.5 8.8A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 1.8Z" />}
      {name === "heartFill" && <Path fill={color} d="M20.5 8.8c0 5.1-8.5 9.7-8.5 9.7S3.5 13.9 3.5 8.8A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 1.8Z" />}
      {name === "sun" && (
        <>
          <Circle {...common} cx="12" cy="12" r="4" />
          <Path {...common} d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </>
      )}
      {name === "moon" && <Path {...common} d="M20.5 14.6A8.2 8.2 0 0 1 9.4 3.5a8.7 8.7 0 1 0 11.1 11.1Z" />}
      {name === "profile" && (
        <>
          <Circle {...common} cx="12" cy="8" r="4" />
          <Path {...common} d="M4.5 20c1.5-4 4.2-6 7.5-6s6 2 7.5 6" />
        </>
      )}
      {name === "phone" && <Path {...common} d="M7.2 4.5 9.4 4l1.7 4-1.5 1.2a11 11 0 0 0 5.2 5.2l1.2-1.5 4 1.7-.5 2.2c-.2 1-1.1 1.7-2.1 1.7A14.9 14.9 0 0 1 5.5 6.6c0-1 .7-1.9 1.7-2.1Z" />}
      {name === "mail" && (
        <>
          <Rect {...common} x="3.5" y="5.5" width="17" height="13" rx="3" />
          <Path {...common} d="m5 8 7 5 7-5" />
        </>
      )}
      {name === "lock" && (
        <>
          <Rect {...common} x="5" y="10" width="14" height="10" rx="2.5" />
          <Path {...common} d="M8 10V7.5a4 4 0 0 1 8 0V10" />
          <Circle fill={color} cx="12" cy="15" r="1.1" />
        </>
      )}
      {name === "mapPin" && (
        <>
          <Path {...common} d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" />
          <Circle {...common} cx="12" cy="10" r="2.5" />
        </>
      )}
      {name === "location" && <Path {...common} d="M12 21s7-6.2 7-12A7 7 0 1 0 5 9c0 5.8 7 12 7 12Zm0-9.5A2.5 2.5 0 1 0 12 6a2.5 2.5 0 0 0 0 5.5Z" />}
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
      {name === "chevronDown" && <Path {...common} d="m6 9 6 6 6-6" />}
      {name === "filter" && <Path {...common} d="M4 6h16M7 12h10M10 18h4" />}
      {name === "clock" && (
        <>
          <Circle {...common} cx="12" cy="12" r="8" />
          <Path {...common} d="M12 8v4l3 2" />
        </>
      )}
      {name === "arrowLeft" && <Path {...common} d="M19 12H5m6-6-6 6 6 6" />}
      {name === "plus" && <Path {...common} d="M12 5v14M5 12h14" />}
      {name === "minus" && <Path {...common} d="M5 12h14" />}
      {name === "trash" && (
        <>
          <Path {...common} d="M4.5 7h15M9 7V4.5h6V7m-8 0 1 13h8l1-13M10 10.5v6M14 10.5v6" />
        </>
      )}
      {name === "x" && <Path {...common} d="M6 6l12 12M18 6 6 18" />}
      {name === "star" && <Path {...common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />}
      {name === "store" && <Path {...common} d="M4 10h16l-1.2-5H5.2L4 10Zm1 0v9h14v-9M9 19v-5h6v5" />}
      {name === "ticket" && <Path {...common} d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V4H4v4Zm8-1v2m0 2v2m0 2v1" />}
      {name === "tikMark" && (
        <>
          <Line {...common} x1="3" y1="8" x2="8" y2="8" />
          <Line {...common} x1="2" y1="12" x2="8" y2="12" />
          <Line {...common} x1="4" y1="16" x2="8" y2="16" />
          <Path {...common} d="M11 5v10.4c0 2.4 1.6 3.6 3.8 3.6H17" />
          <Path {...common} d="M9 9h7.7" />
          <Path {...common} d="M22 11.2c0 4.8-4.2 9.8-4.2 9.8s-4.2-5-4.2-9.8a4.2 4.2 0 1 1 8.4 0Z" />
          <Circle {...common} cx="17.8" cy="11.1" r="1.2" />
        </>
      )}
      {name === "menu" && <Path {...common} d="M5 7h14M5 12h14M5 17h14" />}
      {name === "bell" && <Path {...common} d="M18 9a6 6 0 0 0-12 0c0 7-3 6-3 8h18c0-2-3-1-3-8Zm-4 11a2 2 0 0 1-4 0" />}
      {name === "google" && (
        <>
          <Path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7Z" fill="#4285F4" />
          <Path d="M12 21c2.6 0 4.8-.8 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9a5.6 5.6 0 0 1-5.3-3.9H3.5v2.5A9.5 9.5 0 0 0 12 21Z" fill="#34A853" />
          <Path d="M6.7 13.3a5.7 5.7 0 0 1 0-3.6V7.2H3.5a9.5 9.5 0 0 0 0 8.6l3.2-2.5Z" fill="#FBBC05" />
          <Path d="M12 6.8c1.4 0 2.7.5 3.7 1.5l2.8-2.8A9.4 9.4 0 0 0 12 3 9.5 9.5 0 0 0 3.5 7.2l3.2 2.5A5.6 5.6 0 0 1 12 6.8Z" fill="#EA4335" />
        </>
      )}
      {name === "apple" && <Path fill={color} d="M16.5 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.3.7-2.9.7-.6 0-1.5-.7-2.5-.7-1.3 0-2.5.8-3.2 1.9-1.4 2.4-.4 5.9 1 7.8.7.9 1.5 2 2.5 2s1.4-.6 2.6-.6 1.6.6 2.6.6 1.8-1 2.5-1.9c.8-1.1 1.1-2.2 1.1-2.3 0 0-2.5-1-2.5-3.8ZM14.6 6.7c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.6 1 0 1.9-.5 2.5-1.2Z" />}
      {name === "verified" && (
        <>
          <Path fill={color} d="M20.4 12c0-.6-.2-1.2-.5-1.8-.3-.5-.8-1-1.4-1.2.2-.6.3-1.3.1-1.9-.1-.6-.4-1.2-.9-1.7-.5-.4-1-.7-1.7-.9-.6-.1-1.3-.1-1.9.1-.3-.6-.7-1.1-1.2-1.4-.5-.4-1.2-.6-1.8-.6-.6 0-1.3.2-1.8.6-.5.3-1 .8-1.2 1.4-.6-.2-1.3-.3-1.9-.1-.6.1-1.2.4-1.7.9-.4.5-.7 1-.9 1.7-.1.6-.1 1.3.1 1.9-.6.3-1.1.7-1.4 1.2-.4.5-.6 1.2-.6 1.8 0 .6.2 1.3.6 1.8.3.5.8 1 1.4 1.2-.2.6-.3 1.3-.1 1.9.1.6.4 1.2.9 1.7.5.4 1 .7 1.7.9.6.1 1.3.1 1.9-.1.3.6.7 1.1 1.2 1.4.5.4 1.2.6 1.8.6.6 0 1.3-.2 1.8-.6.5-.3 1-.8 1.2-1.4.6.2 1.3.3 1.9.1.6-.1 1.2-.4 1.7-.9.4-.5.7-1 .9-1.7.1-.6.1-1.3-.1-1.9.6-.3 1.1-.7 1.4-1.2.3-.5.5-1.2.5-1.8Z" />
          <Path d="m8.1 12.2 2.2 2.2 5.4-5.4" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
      {name === "instagram" && (
        <>
          <Rect {...common} x="3.5" y="3.5" width="17" height="17" rx="5" />
          <Circle {...common} cx="12" cy="12" r="4" />
          <Circle fill={color} cx="17" cy="7" r="1.2" />
        </>
      )}
      {name === "utensils" && (
        <>
          <Path {...common} d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18" />
          <Path {...common} d="M20 3v18M20 3c-3 1.8-4.5 4.2-4.5 7.2V13H20" />
        </>
      )}
      {name === "whatsapp" && (
        <>
          <Path fill={color} d="M12 3a8.7 8.7 0 0 0-7.4 13.3L3.5 21l4.8-1.1A8.7 8.7 0 1 0 12 3Z" />
          <Path d="M9.1 8.2c-.2-.5-.4-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-.9 1-.9 2.3 0 1.3 1 2.6 1.1 2.8.1.2 1.9 3.1 4.8 4.2 2.4 1 2.9.6 3.4.6.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.6-.4l-1.8-.8c-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.8-3.4-.2-.4.2-.6.5-1 .1-.1.2-.3.3-.5.1-.2.1-.4 0-.6l-.8-1.9Z" fill="#fff" />
        </>
      )}
    </Svg>
  );
}

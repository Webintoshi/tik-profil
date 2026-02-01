import { ThemeProvider } from "@/components/explore/ThemeProvider";
import { LocationProvider } from "@/components/explore/LocationProvider";

export default function KesfetLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <LocationProvider>
                {children}
            </LocationProvider>
        </ThemeProvider>
    );
}

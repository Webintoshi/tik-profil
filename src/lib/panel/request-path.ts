export const PANEL_PATHNAME_HEADER = "x-tikprofil-panel-pathname";

export function createPanelForwardHeaders(source: Headers, pathname: string): Headers {
    const headers = new Headers(source);
    const safePathname = pathname.startsWith("/panel") && !pathname.includes("?") && !pathname.includes("#")
        ? pathname
        : "/panel";
    headers.set(PANEL_PATHNAME_HEADER, safePathname);
    return headers;
}

export function readPanelForwardedPathname(headers: Headers): string {
    const pathname = headers.get(PANEL_PATHNAME_HEADER);
    return pathname?.startsWith("/panel") && !pathname.includes("?") && !pathname.includes("#")
        ? pathname
        : "/panel";
}

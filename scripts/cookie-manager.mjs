
// Simple cookie storage for ongoing sessions
let currentCookie = '';

export function updateCookie(newCookie) {
    currentCookie = newCookie;
}

export function getCookie() {
    return currentCookie;
}

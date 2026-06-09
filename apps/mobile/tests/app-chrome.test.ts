import { androidAppChromeConfig } from "../src/system/app-chrome-config";

describe("native app chrome", () => {
  it("uses fullscreen-friendly Android system chrome", () => {
    expect(androidAppChromeConfig).toEqual({
      navigationBarHidden: true,
      navigationBarStyle: "dark",
      statusBarBackgroundColor: "transparent",
      statusBarStyle: "dark-content",
      statusBarTranslucent: true,
    });
  });
});

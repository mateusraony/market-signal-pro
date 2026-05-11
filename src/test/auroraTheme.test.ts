import { describe, it, expect, beforeEach } from "vitest";
import { ensureAuroraTheme, getAuroraThemeSnapshot } from "@/lib/auroraTheme";

const ROUTES = ["/", "/auth", "/alerts", "/reset-password", "/not-a-real-route"];

function simulateNavigation(path: string) {
  window.history.pushState({}, "", path);
  ensureAuroraTheme(`navigation:${path}`);
}

function simulateReload() {
  // Wipe attributes the way an old cached HTML/JS bundle could.
  document.documentElement.removeAttribute("data-aurora");
  document.body.removeAttribute("data-aurora");
  document.documentElement.classList.add("aurora-off");
  document.body.classList.add("aurora-off");
  // Bootstrap (mirroring index.html inline + main.tsx ensureAuroraTheme).
  ensureAuroraTheme("bootstrap");
}

function simulateAlertTrigger() {
  // Simulate a third-party lib (toast/alert dialog) trying to flip theme.
  document.documentElement.setAttribute("data-aurora", "off");
  document.body.classList.add("aurora-off");
  ensureAuroraTheme("alert-triggered");
}

function expectAuroraActive() {
  const snap = getAuroraThemeSnapshot();
  expect(snap.htmlAttr).toBe("on");
  expect(snap.bodyAttr).toBe("on");
  expect(snap.htmlClasses).not.toContain("aurora-off");
  expect(snap.bodyClasses).not.toContain("aurora-off");
  expect(snap.colorScheme).toBe("dark");
}

describe("Aurora theme persistence", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.body.className = "";
    document.documentElement.removeAttribute("data-aurora");
    document.body.removeAttribute("data-aurora");
    document.documentElement.style.colorScheme = "";
    document.body.style.colorScheme = "";
  });

  it("applies data-aurora=on after a simulated reload", () => {
    simulateReload();
    expectAuroraActive();
  });

  it("keeps Aurora active across all routes", () => {
    simulateReload();
    for (const route of ROUTES) {
      simulateNavigation(route);
      expectAuroraActive();
      expect(window.location.pathname).toBe(route);
    }
  });

  it("restores Aurora when an alert trigger tries to revert the theme", () => {
    simulateReload();
    simulateAlertTrigger();
    expectAuroraActive();
  });

  it("never leaves the legacy layout active across reload + navigation + alert cycle", () => {
    simulateReload();
    expectAuroraActive();

    for (const route of ROUTES) {
      simulateNavigation(route);
      expectAuroraActive();
      simulateAlertTrigger();
      expectAuroraActive();
    }
  });
});

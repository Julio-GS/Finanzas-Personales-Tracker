import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock server-only in test environment so server-only modules can be unit tested
vi.mock("server-only", () => ({}));

// Mock next/font/local for Vitest jsdom test environment
vi.mock("next/font/local", () => {
  return {
    default: (options: { variable?: string }) => {
      const varName = options?.variable?.replace(/^--/, "") || "font-local";
      return {
        className: varName,
        variable: varName,
        style: { fontFamily: varName },
      };
    },
  };
});


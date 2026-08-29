import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RootLayout, { metadata, viewport } from "@/app/layout";
import tailwindConfig from "@/tailwind.config";
import fs from "fs";
import path from "path";

describe("Typography & RootLayout Geist Integration", () => {
  it("renders RootLayout with Geist Sans and Geist Mono variable classes on the html element", () => {
    render(
      <RootLayout>
        <div data-testid="child-content">App Content</div>
      </RootLayout>
    );

    const htmlElement = document.documentElement;
    expect(htmlElement.className).toContain("dark");
    // Geist variable class names from geist/font/sans and geist/font/mono
    expect(htmlElement.className).toMatch(/(geist-sans|font-geist-sans)/);
    expect(htmlElement.className).toMatch(/(geist-mono|font-geist-mono)/);
    expect(htmlElement.getAttribute("lang")).toBe("es");

    const bodyElement = document.body;
    expect(bodyElement.className).toContain("font-sans");
    expect(bodyElement.className).toContain("bg-background");
    expect(bodyElement.className).toContain("text-foreground");
    expect(bodyElement.className).toContain("pb-safe");

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("App Content")).toBeInTheDocument();
  });

  it("configures Tailwind to map sans font family to var(--font-geist-sans) with safe fallbacks", () => {
    const fontFamily = tailwindConfig.theme?.extend?.fontFamily as
      | { sans?: string[]; mono?: string[] }
      | undefined;

    expect(fontFamily).toBeDefined();
    expect(fontFamily?.sans).toBeDefined();
    expect(fontFamily?.sans?.[0]).toBe("var(--font-geist-sans)");
    expect(fontFamily?.sans).toContain("system-ui");
    expect(fontFamily?.sans).toContain("sans-serif");
  });

  it("configures Tailwind to map mono font family to var(--font-geist-mono) with safe fallbacks", () => {
    const fontFamily = tailwindConfig.theme?.extend?.fontFamily as
      | { sans?: string[]; mono?: string[] }
      | undefined;

    expect(fontFamily).toBeDefined();
    expect(fontFamily?.mono).toBeDefined();
    expect(fontFamily?.mono?.[0]).toBe("var(--font-geist-mono)");
    expect(fontFamily?.mono).toContain("ui-monospace");
    expect(fontFamily?.mono).toContain("monospace");
  });

  it("does not have competing hardcoded SF/system font-family in globals.css", () => {
    const globalsCssPath = path.resolve(__dirname, "../../app/globals.css");
    const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");

    expect(globalsCss).not.toContain("SF Pro Text");
    expect(globalsCss).not.toContain("SF Pro Display");
    expect(globalsCss).toContain("font-sans");
  });

  it("preserves dark viewport and accessibility metadata settings", () => {
    expect(viewport.colorScheme).toBe("dark");
    expect(viewport.themeColor).toBe("#000000");
    expect(viewport.viewportFit).toBe("cover");
    expect(metadata.title).toBe("Finanzas Tracker");
    expect(metadata.description).toBe("Voice-first personal finance & investment tracker");
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Finanzas Tracker",
    });
  });
});

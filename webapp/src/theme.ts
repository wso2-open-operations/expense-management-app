// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
// MUI Import
import { type PaletteMode } from "@mui/material";

import designTokens from "./styles/design-tokens.json";

// Helper function to remove 'ff' suffix from hex colors
const cleanHexColor = (color: string): string => {
  if (color.endsWith("ff")) {
    return color.slice(0, -2);
  }
  return color;
};

// Extract and transform color tokens from design tokens
const extractColors = () => {
  const { variables } = designTokens;

  return {
    neutral: Object.entries(variables.colors.neutral).reduce(
      (acc, [key, token]: [string, any]) => {
        acc[key] = cleanHexColor(token.value);
        return acc;
      },
      {} as Record<string, string>,
    ),

    primary: Object.entries(variables.colors.primary).reduce(
      (acc, [key, token]: [string, any]) => {
        acc[key] = cleanHexColor(token.value);
        return acc;
      },
      {} as Record<string, string>,
    ),

    secondary: Object.entries(variables.colors.secondary).reduce(
      (acc, [key, token]: [string, any]) => {
        acc[key] = cleanHexColor(token.value);
        return acc;
      },
      {} as Record<string, string>,
    ),
  };
};

// Extract font/typography tokens
const extractTypography = () => {
  const { font } = designTokens;

  return {
    h1: font.h1.value,
    h2: font.h2.value,
    h3: font.h3.value,
    h4: font.h4.value,
    h5: font.h5.value,
    h6: font.h6.value,
    body1: font["p-r"].value,
    body2: font["p-m"].value,
    caption: font["p-s"].value,
    overline: font["p-xs"].value,
  };
};

// Color Design Tokens with mode support
export const tokens = (mode: PaletteMode) => {
  const colors = extractColors();

  return {
    ...(mode === "dark"
      ? {
          // Neutral colors
          neutral: colors.neutral,
          secondary: colors.secondary,
          primary: colors.primary,

          // Text colors - Dark mode (from Figma design tokens)
          text: {
            primary: {
              p1: { active: colors.neutral.white, hover: "#ffffff" },
              p2: { active: colors.neutral["400"], hover: "#ffffff" },
              p3: { active: colors.neutral["800"], hover: "#ffffff" },
              p4: { active: colors.neutral["1300"], hover: "#ffffff" },
            },
            brand: {
              p1: { active: colors.primary["1100"], hover: "#FF6A0096" },
            },
          },

          // Border colors - Dark mode (from Figma design tokens)
          border: {
            primary: {
              active: colors.neutral.white,
              hover: colors.neutral.white,
              clicked: colors.neutral.white,
              disabled: colors.neutral.white,
            },
            secondary: {
              active: colors.neutral.white,
              hover: colors.neutral.white,
              clicked: colors.neutral.white,
              disabled: colors.neutral.white,
            },
            territory: {
              active: colors.neutral["1700"],
              hover: colors.neutral["1500"],
              clicked: colors.neutral.white,
              disabled: colors.neutral.white,
            },
          },

          // Navigation colors - Dark mode
          navigation: {
            text: "#ffffff8f",
            textClicked: "#ffffff",
            hover: "#ffffffd9",
            hoverBg: "#ffffff0a",
            clickedBg: "#ffffff14",
            border: colors.neutral["1700"],
          },

          // Surface colors (from color tokens)
          surface: {
            primary: {
              active: colors.neutral["1800"],
              hover: colors.neutral["1900"],
            },
            secondary: {
              active: colors.secondary["2000"],
              hover: colors.secondary["1700"],
            },
            territory: {
              active: "#171717",
            },
          },

          // Fill colors (from color tokens)
          fill: {
            primary: {
              active: colors.primary["1700"],
              hover: colors.primary["1600"],
              clicked: colors.primary["1800"],
              disabled: "#3D190196",
            },
            secondary: {
              active: colors.secondary["1400"],
              hover: colors.secondary["1300"],
              clicked: colors.secondary["1500"],
              disabled: "#0A475C96",
            },
            territory: {
              active: colors.secondary["1900"],
            },
          },
        }
      : {
          // Light mode colors
          neutral: colors.neutral,
          primary: colors.primary,
          secondary: colors.secondary,

          // Text colors - Light mode (from Figma design tokens)
          text: {
            primary: {
              p1: { active: colors.neutral.black, hover: "#ffffff" },
              p2: { active: colors.neutral["1600"], hover: "#ffffff" },
              p3: { active: colors.neutral["1200"], hover: "#ffffff" },
              p4: { active: colors.neutral["700"], hover: "#ffffff" },
            },
            brand: {
              p1: { active: colors.primary["brand"], hover: "#ffffff", disabled: "#ff730096" },
            },
          },

          // Border colors - Light mode
          border: {
            primary: {
              active: colors.neutral.black,
              hover: colors.neutral.white,
              clicked: colors.neutral.white,
              disabled: colors.neutral.white,
            },
            secondary: {
              active: colors.neutral.white,
              hover: colors.neutral.white,
              clicked: colors.neutral.white,
              disabled: colors.neutral.white,
            },
            territory: {
              active: colors.neutral["200"],
              hover: colors.neutral["400"],
              clicked: colors.neutral.white,
              disabled: colors.neutral.white,
            },
          },

          // Surface colors (from color tokens)
          surface: {
            primary: {
              active: colors.neutral.light_white,
              hover: colors.neutral.white,
            },
            secondary: {
              active: colors.secondary["1500"],
              hover: "#FFF",
            },
            territory: {
              active: colors.neutral.white,
            },
          },

          // Fill colors (from color tokens)
          fill: {
            primary: {
              active: colors.primary.main,
              hover: colors.primary["900"],
              clicked: colors.primary["1100"],
              disabled: "#FF730096",
            },
            secondary: {
              active: colors.secondary.main,
              hover: colors.secondary["600"],
              clicked: colors.secondary["800"],
              disabled: "#00CEFF96",
            },
            territory: {
              active: colors.secondary["1600"],
            },
          },

          // Navigation colors - Light mode
          navigation: {
            text: "#ffffffbd",
            textClicked: "#ffffff",
            hover: "#ffffffd9",
            hoverBg: "#ffffff0a",
            clickedBg: colors.secondary["1600"],
            border: "#2F454C",
          },
        }),
  };
};

// Extend MUI theme types
declare module "@mui/material/styles" {
  interface TypeBackground {
    primary?: string;
    secondary?: string;
    secondaryLight?: string;
    primaryLight?: string;
    lightWhite?: string;
  }

  interface TypeText {
    brand?: string;
  }

  interface Palette {
    neutral: Record<string | number, string | undefined>;
    primaryShades: Record<string, string>;
    secondaryShades: Record<string, string>;
    customBorder: {
      primary: {
        active: string;
        hover: string;
        clicked: string;
        disabled: string;
      };
      secondary: {
        active: string;
        hover: string;
        clicked: string;
        disabled: string;
      };
      territory: {
        active: string;
        hover: string;
        clicked: string;
        disabled: string;
      };
    };
    customNavigation: {
      text: string;
      textClicked: string;
      hover: string;
      hoverBg: string;
      clicked: string;
      clickedBg: string;
      border: string;
    };
    surface: {
      primary: Record<string, string>;
      secondary: Record<string, string>;
      territory: Record<string, string>;
    };
    fill: {
      primary: Record<string, string>;
      secondary: Record<string, string>;
      territory: Record<string, string>;
    };
    customText: {
      primary: {
        p1: { active: string; hover: string };
        p2: { active: string; hover: string };
        p3: { active: string; hover: string };
        p4: { active: string; hover: string };
      };
      brand: {
        p1: { active: string; hover: string; disabled?: string };
      };
    };
  }

  interface PaletteOptions {
    neutral?: Record<string | number, string | undefined>;
    primaryShades?: Record<string, string>;
    secondaryShades?: Record<string, string>;
    customBorder?: {
      primary?: {
        active: string;
        hover: string;
        clicked: string;
        disabled: string;
      };
      secondary?: {
        active: string;
        hover: string;
        clicked: string;
        disabled: string;
      };
      territory?: {
        active: string;
        hover: string;
        clicked: string;
        disabled: string;
      };
    };
    customNavigation?: {
      text?: string;
      textClicked?: string;
      bg?: string;
      hover?: string;
      hoverBg?: string;
      clicked?: string;
      clickedBg?: string;
      border: string;
    };
    surface?: {
      primary?: Record<string, string>;
      secondary?: Record<string, string>;
      territory?: Record<string, string>;
    };
    fill?: {
      primary?: Record<string, string>;
      secondary?: Record<string, string>;
      territory?: Record<string, string>;
    };
    customText?: {
      primary?: {
        p1?: { active: string; hover: string };
        p2?: { active: string; hover: string };
        p3?: { active: string; hover: string };
        p4?: { active: string; hover: string };
      };
      brand?: {
        p1?: { active: string; hover: string; disabled?: string };
      };
    };
  }
}

// MUI Theme Settings
export const themeSettings = (mode: PaletteMode) => {
  const colors = tokens(mode);
  const typography = extractTypography();

  return {
    palette: {
      mode: mode,
      primary: {
        main: colors.primary.main,
        light: colors.primary["400"],
        dark: colors.primary["1000"],
        contrastText: "#ffffff",
      },
      secondary: {
        main: colors.secondary.main,
        light: colors.secondary["400"],
        dark: colors.secondary["900"],
        contrastText: "#ffffff",
      },
      error: {
        main: "#fe4336",
        light: "#ff6b5e",
        dark: "#c41c0f",
      },
      warning: {
        main: "#ff9800",
        light: "#ffb74d",
        dark: "#f57c00",
      },
      info: {
        main: colors.secondary.main,
        light: colors.secondary["400"],
        dark: colors.secondary["900"],
      },
      success: {
        main: "#4caf50",
        light: "#81c784",
        dark: "#388e3c",
      },
      // Custom palette extensions - preserve all color shades
      neutral: colors.neutral,
      primaryShades: colors.primary,
      secondaryShades: colors.secondary,
      customBorder: colors.border,
      customNavigation: colors.navigation,
      surface: colors.surface,
      fill: colors.fill,
      customText: colors.text,
    },
    typography: {
      fontSize: 14,
      h1: {
        fontSize: typography.h1.fontSize,
        fontWeight: typography.h1.fontWeight,
        lineHeight: `${typography.h1.lineHeight}px`,
        letterSpacing: `${typography.h1.letterSpacing}px`,
      },
      h2: {
        fontSize: typography.h2.fontSize,
        fontWeight: typography.h2.fontWeight,
        lineHeight: `${typography.h2.lineHeight}px`,
        letterSpacing: `${typography.h2.letterSpacing}px`,
      },
      h3: {
        fontSize: typography.h3.fontSize,
        fontWeight: typography.h3.fontWeight,
        lineHeight: `${typography.h3.lineHeight}px`,
        letterSpacing: `${typography.h3.letterSpacing}px`,
      },
      h4: {
        fontSize: typography.h4.fontSize,
        fontWeight: typography.h4.fontWeight,
        lineHeight: `${typography.h4.lineHeight}px`,
        letterSpacing: `${typography.h4.letterSpacing}px`,
      },
      h5: {
        fontSize: typography.h5.fontSize,
        fontWeight: typography.h5.fontWeight,
        lineHeight: `${typography.h5.lineHeight}px`,
        letterSpacing: `${typography.h5.letterSpacing}px`,
      },
      h6: {
        fontSize: typography.h6.fontSize,
        fontWeight: typography.h6.fontWeight,
        lineHeight: `${typography.h6.lineHeight}px`,
        letterSpacing: `${typography.h6.letterSpacing}px`,
      },
      body1: {
        fontSize: typography.body1.fontSize,
        fontWeight: typography.body1.fontWeight,
        lineHeight: `${typography.body1.lineHeight}px`,
        letterSpacing: `${typography.body1.letterSpacing}px`,
      },
      body2: {
        fontSize: typography.body2.fontSize,
        fontWeight: typography.body2.fontWeight,
        lineHeight: `${typography.body2.lineHeight}px`,
        letterSpacing: `${typography.body2.letterSpacing}px`,
      },
      caption: {
        fontSize: typography.caption.fontSize,
        fontWeight: typography.caption.fontWeight,
        lineHeight: `${typography.caption.lineHeight}px`,
        letterSpacing: `${typography.caption.letterSpacing}px`,
      },
      overline: {
        fontSize: typography.overline.fontSize,
        fontWeight: typography.overline.fontWeight,
        lineHeight: `${typography.overline.lineHeight}px`,
        letterSpacing: `${typography.overline.letterSpacing}px`,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none" as const,
            borderRadius: 8,
            fontWeight: 500,
            letterSpacing: "0.5px",
          },
          contained: {
            backgroundColor: colors.primary.main,
            color: colors.neutral.white,
            "&:hover": {
              backgroundColor: colors.primary["800"],
            },
            "&:active": {
              backgroundColor: colors.primary["1000"],
            },
            "&.Mui-disabled": {
              backgroundColor: colors.fill.primary.disabled,
              color: colors.text.brand.p1.disabled,
            },
          },
          outlined: {
            borderColor: colors.border.primary.active,
            color: colors.text.primary.p1.active,
            "&:hover": {
              borderColor: colors.border.territory.hover,
              backgroundColor: colors.surface.primary.hover,
            },
          },
          text: {
            color: colors.text.primary.p1.active,
            "&:hover": {
              backgroundColor: colors.surface.primary.hover,
            },
          },
        },
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
    shape: {
      borderRadius: 8,
    },
    spacing: 8,
  };
};

// Export for convenience
export default themeSettings;

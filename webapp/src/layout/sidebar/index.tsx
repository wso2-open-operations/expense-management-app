// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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

import { Box, Divider, Stack, Tooltip, Typography, useTheme } from "@wso2/oxygen-ui";
import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";

import { useMemo, useState } from "react";

import type { NavState } from "@/types/types";
import SidebarNavItem from "@component/layout/SidebarNavItem";
import pJson from "@root/package.json";
import { ColorModeContext } from "@src/App";
import { getActiveRouteDetails } from "@src/route";
import { useViewMode } from "@context/ViewModeContext";

interface SidebarProps {
  open: boolean;
  handleDrawer: () => void;
  roles: string[];
  currentPath: string;
}

const Sidebar = (props: SidebarProps) => {
  const allRoutes = useMemo(() => getActiveRouteDetails(props.roles), [props.roles]);
  const { viewMode, setViewMode } = useViewMode();

  const [navState, setNavState] = useState<NavState>({
    active: null,
    hovered: null,
    expanded: null,
  });

  const handleClick = (idx: number) => {
    setNavState((prev) => ({
      ...prev,
      active: prev.active === idx ? null : idx,
    }));
  };

  const handleMouseEnter = (idx: number) => {
    setNavState((prev) => ({ ...prev, hovered: idx }));
  };

  const handleMouseLeave = () => {
    setNavState((prev) => ({ ...prev, hovered: null }));
  };
  const theme = useTheme();

  const renderControlButton = (
    icon: React.ReactNode,
    onClick?: () => void,
    tooltipTitle?: string,
  ) => {
    const button = (
      <Box
        component="button"
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={tooltipTitle}
        sx={{
          width: props.open ? "100%" : "fit-content",
          padding: theme.spacing(1),
          borderRadius: "8px",
          cursor: onClick ? "pointer" : "default",
          border: "none",
          background: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: props.open ? "flex-start" : "center",
          gap: theme.spacing(1),
          color: theme.palette.customNavigation.text,
          transition: "all 0.2s ease-in-out",
          ...(onClick && {
            "&:hover": {
              backgroundColor: theme.palette.customNavigation.hoverBg,
              color: theme.palette.customNavigation.hover,
            },
            "&:active": {
              backgroundColor: theme.palette.customNavigation.clickedBg,
              color: theme.palette.customNavigation.clicked,
            },
          }),
        }}
      >
        {icon}
      </Box>
    );

    if (tooltipTitle && !props.open) {
      return (
        <Tooltip
          title={tooltipTitle}
          placement="right"
          arrow
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: theme.palette.neutral[1700],
                color: theme.palette.neutral.white,
                padding: theme.spacing(0.75, 1),
                borderRadius: "4px",
                fontSize: "12px",
                boxShadow: theme.shadows[8],
              },
            },
            arrow: {
              sx: {
                color: theme.palette.neutral[1700],
              },
            },
          }}
        >
          {button}
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <ColorModeContext.Consumer>
      {(colorMode: { mode: string; toggleColorMode: (() => void) | undefined }) => {
        const currentYear = new Date().getFullYear();

        return (
          <Box
            sx={{
              height: "100%",
              paddingY: "16px",
              paddingX: "12px",
              backgroundColor: theme.palette.surface.secondary.active,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              width: props.open ? "200px" : "fit-content",
              overflow: "visible",
            }}
          >
            {/* View mode toggle */}
            <Box sx={{ mb: 1, width: props.open ? "100%" : "fit-content" }}>
              {props.open ? (
                <Box
                  sx={{
                    display: "flex",
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: theme.palette.customNavigation?.clickedBg ?? "divider",
                    overflow: "hidden",
                    width: "100%",
                  }}
                >
                  {(["admin", "employee", "lead"] as const).map((mode) => (
                    <Box
                      key={mode}
                      component="button"
                      type="button"
                      onClick={() => setViewMode(mode)}
                      sx={{
                        flex: 1,
                        py: 0.7,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "capitalize",
                        transition: "all 0.15s ease",
                        bgcolor: viewMode === mode
                          ? theme.palette.primary?.main ?? "#f97316"
                          : "transparent",
                        color: viewMode === mode
                          ? "#fff"
                          : theme.palette.customNavigation?.text ?? "text.secondary",
                        "&:hover": viewMode !== mode ? {
                          bgcolor: theme.palette.customNavigation?.hoverBg ?? "action.hover",
                        } : {},
                      }}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Tooltip
                  title={`View: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`}
                  placement="right"
                  arrow
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => {
                      const modes = ["admin", "employee", "lead"] as const;
                      const next = modes[(modes.indexOf(viewMode) + 1) % modes.length];
                      setViewMode(next);
                    }}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      bgcolor: theme.palette.primary?.main ?? "#f97316",
                      color: "#fff",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {viewMode.charAt(0).toUpperCase()}
                  </Box>
                </Tooltip>
              )}
            </Box>

            <Stack
              direction="column"
              gap={1}
              sx={{
                overflow: "visible",
                width: props.open ? "100%" : "fit-content",
              }}
            >
              {allRoutes.map((route, idx) => {
                return (
                  !route.bottomNav && (
                    <Box
                      key={idx}
                      onMouseEnter={() => handleMouseEnter(idx)}
                      onMouseLeave={handleMouseLeave}
                      sx={{
                        width: props.open ? "100%" : "fit-content",
                        cursor: props.open ? "pointer" : "default",
                      }}
                    >
                      <SidebarNavItem
                        route={route}
                        open={props.open}
                        isActive={navState.active === null ? idx === 0 : navState.active === idx}
                        onClick={() => handleClick(idx)}
                      />
                    </Box>
                  )
                );
              })}
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <Stack
              direction="column"
              gap={1}
              sx={{
                paddingBottom: "20px",
                alignItems: "center",
              }}
            >
              {renderControlButton(
                colorMode.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />,
                colorMode.toggleColorMode,
                colorMode.mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
              )}

              {renderControlButton(
                !props.open ? <ChevronRight size={20} /> : <ChevronLeft size={20} />,
                props.handleDrawer,
                props.open ? "Collapse Sidebar" : "Expand Sidebar",
              )}

              <Divider
                sx={{
                  width: "100%",
                  backgroundColor: theme.palette.customNavigation.clickedBg,
                }}
              />

              {renderControlButton(
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "nowrap",
                    color: "inherit",
                    width: "100%",
                  }}
                >
                  {props.open
                    ? `v${pJson.version} | © ${currentYear} WSO2 LLC`
                    : `v${pJson.version.split(".")[0]}`}
                </Typography>,
                undefined,
                `Version ${pJson.version}`,
              )}
            </Stack>
          </Box>
        );
      }}
    </ColorModeContext.Consumer>
  );
};

export default Sidebar;

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
// this file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
// CONDITIONS OF ANY KIND, either express or implied. See the License
// for the specific language governing permissions and limitations under
// the License.

import { Box, MenuItem, Popover, Skeleton, Tooltip, Typography, useTheme } from "@wso2/oxygen-ui";
import { ChevronDown } from "@wso2/oxygen-ui-icons-react";

import { useState } from "react";

interface FilterOption {
  value: string;
  label: string;
}

interface ActiveClaimsChartProps {
  title: string;
  month: string;
  onMonthChange: (value: string) => void;
  loading?: boolean;
  monthOptions: FilterOption[];
  values: number[];
  yAxisLabels: number[];
  xAxisLabels: string[];
  maxBarValue: number;
  chartHeight: number;
  barGap: string | number;
}

export default function ActiveClaimsChart({
  title,
  month,
  onMonthChange,
  loading = false,
  monthOptions,
  values,
  yAxisLabels,
  xAxisLabels,
  maxBarValue,
  chartHeight,
}: ActiveClaimsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  const barColor = theme.palette.primary.main;
  const barHoverColor = theme.palette.primary.dark;

  const selectedLabel = monthOptions.find((o) => o.value === month)?.label ?? "";

  const normalizedMaxBarValue = Math.max(maxBarValue, ...values, 1);
  const barCount = Math.max(values.length, xAxisLabels.length, 1);
  const baseSkeletonHeights = [78, 52, 66, 44, 58, 36, 48, 72];
  const skeletonBarHeights = Array.from({ length: barCount }, (_, index) => {
    return baseSkeletonHeights[index % baseSkeletonHeights.length];
  });
  const renderedBarValues = loading ? skeletonBarHeights : values;

  const xTickLabels = xAxisLabels.map((label) => label.split("-")[0].trim());
  const lastTickLabel = xAxisLabels[xAxisLabels.length - 1]?.split("-")[1]?.trim() ?? "";
  const longestXAxisLabelLength = xAxisLabels.reduce((maxLength, label) => {
    return Math.max(maxLength, label.length);
  }, 0);
  const xAxisFontSize =
    longestXAxisLabelLength > 12 ? 8.5 : longestXAxisLabelLength > 9 ? 9.5 : 10.5;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography
            sx={{ fontWeight: 700, fontSize: 16, color: "text.primary", lineHeight: 1.3 }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.disabled", mt: 0.3 }}>
            Claim distribution by amount range
          </Typography>
        </Box>

        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.4,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            cursor: "pointer",
            userSelect: "none",
            minWidth: 140,
            justifyContent: "space-between",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
            {selectedLabel}
          </Typography>
          <ChevronDown size={16} style={{ color: theme.palette.text.secondary }} />
        </Box>

        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                minWidth: 160,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: 3,
              },
            },
          }}
        >
          {monthOptions.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => {
                onMonthChange(option.value);
                setAnchorEl(null);
              }}
              sx={{
                fontSize: 13,
                fontWeight: option.value === month ? 700 : 400,
                color: option.value === month ? "primary.main" : "text.primary",
                bgcolor: option.value === month ? "action.selected" : "transparent",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </Popover>
      </Box>

      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography
              sx={{
                fontSize: 11,
                color: "text.disabled",
                fontWeight: 600,
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                letterSpacing: 0.5,
                whiteSpace: "nowrap",
              }}
            >
              Employee Count
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "flex-end",
              pr: 1,
              height: chartHeight,
              minWidth: 28,
            }}
          >
            {yAxisLabels.map((label) => (
              <Typography key={label} sx={{ fontSize: 11, color: "text.disabled", lineHeight: 1 }}>
                {label}
              </Typography>
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${barCount}, 1fr)`,
              height: chartHeight,
              alignItems: "flex-end",
              gap: "2px",
              pr: 2,
            }}
          >
            {renderedBarValues.map((value, index) => {
              const heightPercent = Math.min(100, (value / normalizedMaxBarValue) * 100);
              const isHovered = hoveredIndex === index;

              if (loading) {
                return (
                  <Box
                    key={`loading-${index}`}
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems: "flex-end",
                    }}
                  >
                    <Skeleton
                      variant="rectangular"
                      animation="wave"
                      sx={{
                        width: "100%",
                        height: `${heightPercent}%`,
                        borderRadius: "6px 6px 0 0",
                        transform: `scaleY(${0.92 + index * 0.01})`,
                        transformOrigin: "bottom",
                        opacity: 0.9,
                      }}
                    />
                  </Box>
                );
              }

              return (
                <Tooltip
                  key={index}
                  title={
                    <Box sx={{ px: 0.5, py: 0.2 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                        {value} Claims
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.7)", mt: 0.2 }}>
                        {xAxisLabels[index]}
                      </Typography>
                    </Box>
                  }
                  placement="top"
                  arrow
                  slotProps={{
                    popper: {
                      modifiers: [{ name: "offset", options: { offset: [0, 4] } }],
                    },
                  }}
                >
                  <Box
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems: "flex-end",
                      cursor: "pointer",
                    }}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        height: `${heightPercent}%`,
                        backgroundColor: isHovered ? barHoverColor : barColor,
                        transition: "background-color 0.25s ease, opacity 0.25s ease",
                        opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                      }}
                    />
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${barCount}, 1fr)`,
              mt: 0.8,
              position: "relative",
              pr: 2,
            }}
          >
            {xTickLabels.map((tick, index) => (
              <Box key={index} sx={{ position: "relative", height: 16 }}>
                <Typography
                  sx={{
                    fontSize: xAxisFontSize,
                    color: "text.disabled",
                    fontWeight: 600,
                    lineHeight: 1,
                    position: "absolute",
                    left: 0,
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tick}
                </Typography>
                {index === barCount - 1 && (
                  <Typography
                    sx={{
                      fontSize: xAxisFontSize,
                      color: "text.disabled",
                      fontWeight: 600,
                      lineHeight: 1,
                      position: "absolute",
                      right: 0,
                      transform: "translateX(10%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lastTickLabel}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
            <Typography
              sx={{
                fontSize: 11,
                color: "text.disabled",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              Amount Range
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

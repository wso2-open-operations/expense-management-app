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
import { Box, Tooltip, Typography, useTheme } from "@wso2/oxygen-ui";

import { type ReactNode, useState } from "react";

export interface BarChartItem {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarChartItem[];
  height?: number;
  barColor?: string;
  barHoverColor?: string;
  barWidth?: string | number;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  tooltipContent?: (item: BarChartItem, index: number) => ReactNode;
  maxValue?: number;
}

export default function BarChart({
  data,
  height = 260,
  barColor,
  barHoverColor,
  barWidth = "100%",
  formatValue = (v) => v.toLocaleString(),
  yAxisLabel = "Amount",
  xAxisLabel,
  tooltipContent,
  maxValue: maxValueProp,
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const theme = useTheme();

  const defaultBarColor = theme.palette.primary.main;
  const defaultBarHoverColor = theme.palette.primary.dark;
  const resolvedBarColor = barColor ?? defaultBarColor;
  const resolvedBarHoverColor = barHoverColor ?? defaultBarHoverColor;

  const maxValue = maxValueProp ?? Math.max(...data.map((d) => d.value), 1);
  const yAxisValues = [
    maxValue,
    Math.round(maxValue * 0.75),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.25),
    0,
  ];

  return (
    <Box sx={{ display: "flex", gap: 0.5, flex: 1 }}>
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
            {yAxisLabel}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-end",
            pr: 1,
            height,
            minWidth: 40,
          }}
        >
          {yAxisValues.map((label, i) => (
            <Typography key={i} sx={{ fontSize: 10, color: "text.disabled", lineHeight: 1 }}>
              {formatValue(label)}
            </Typography>
          ))}
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${data.length}, 1fr)`,
            height,
            alignItems: "flex-end",
            gap: "3px",
          }}
        >
          {data.map((item, index) => {
            const heightPercent = Math.min(100, (item.value / maxValue) * 100);
            const isHovered = hoveredIndex === index;

            return (
              <Tooltip
                key={index}
                title={
                  tooltipContent ? (
                    tooltipContent(item, index)
                  ) : (
                    <Box sx={{ px: 0.5, py: 0.2 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                        {formatValue(item.value)}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.7)", mt: 0.2 }}>
                        {item.label}
                      </Typography>
                    </Box>
                  )
                }
                placement="top"
                arrow
              >
                <Box
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Box
                    sx={{
                      width: barWidth,
                      maxWidth: "100%",
                      height: `${heightPercent}%`,
                      minHeight: heightPercent > 0 ? 4 : 0,
                      backgroundColor: isHovered ? resolvedBarHoverColor : resolvedBarColor,
                      borderRadius: "4px 4px 0 0",
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
            gridTemplateColumns: `repeat(${data.length}, 1fr)`,
            mt: 0.8,
          }}
        >
          {data.map((item, index) => (
            <Typography
              key={index}
              sx={{
                fontSize: data.length > 6 ? 9 : 10.5,
                color: "text.disabled",
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.2,
                px: 0.2,
              }}
            >
              {item.label}
            </Typography>
          ))}
        </Box>

        {xAxisLabel && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
            <Typography
              sx={{ fontSize: 11, color: "text.disabled", fontWeight: 600, letterSpacing: 0.5 }}
            >
              {xAxisLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

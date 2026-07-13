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

export interface HorizontalBarItem {
  label: string;
  sublabel?: string;
  value: number;
}

export interface HorizontalBarChartProps {
  data: HorizontalBarItem[];
  barColor?: string;
  barHoverColor?: string;
  formatValue?: (value: number) => string;
  onItemClick?: (item: HorizontalBarItem, index: number) => void;
  showRank?: boolean;
  barHeight?: number;
  labelWidth?: number;
  tooltipContent?: (item: HorizontalBarItem, index: number) => ReactNode;
  maxValue?: number;
}

export default function HorizontalBarChart({
  data,
  barColor,
  barHoverColor,
  formatValue = (v) => v.toLocaleString(),
  onItemClick,
  showRank = true,
  barHeight = 28,
  labelWidth = 130,
  tooltipContent,
  maxValue: maxValueProp,
}: HorizontalBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const theme = useTheme();

  const defaultBarColor = theme.palette.primary.main;
  const defaultBarHoverColor = theme.palette.primary.dark;
  const resolvedBarColor = barColor ?? defaultBarColor;
  const resolvedBarHoverColor = barHoverColor ?? defaultBarHoverColor;

  const maxValue = maxValueProp ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, flex: 1 }}>
      {data.map((item, index) => {
        const widthPercent = Math.min(100, (item.value / maxValue) * 100);
        const isHovered = hoveredIndex === index;

        return (
          <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {showRank && (
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: index < 3 ? "primary.main" : "text.disabled",
                  minWidth: 18,
                  textAlign: "right",
                }}
              >
                #{index + 1}
              </Typography>
            )}

            <Box sx={{ minWidth: labelWidth, maxWidth: labelWidth }}>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "text.primary",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Typography>
              {item.sublabel && (
                <Typography
                  sx={{
                    fontSize: 11,
                    color: "text.disabled",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.sublabel}
                </Typography>
              )}
            </Box>

            <Box sx={{ flex: 1 }}>
              <Tooltip
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
                  onClick={() => onItemClick?.(item, index)}
                  sx={{
                    width: `${widthPercent}%`,
                    minWidth: widthPercent > 0 ? 4 : 0,
                    height: barHeight,
                    backgroundColor: isHovered ? resolvedBarHoverColor : resolvedBarColor,
                    borderRadius: "0 4px 4px 0",
                    transition: "background-color 0.25s ease, opacity 0.25s ease, width 0.4s ease",
                    opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                    cursor: onItemClick ? "pointer" : "default",
                  }}
                />
              </Tooltip>
            </Box>

            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                color: "text.primary",
                minWidth: 60,
                textAlign: "right",
              }}
            >
              {formatValue(item.value)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

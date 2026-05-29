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

import { type ReactNode, useMemo, useState } from "react";

export interface DoughnutChartItem {
  label: string;
  value: number;
  sublabel?: string;
}

export interface DoughnutChartProps {
  data: DoughnutChartItem[];
  size?: number;
  thickness?: number;
  formatValue?: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
  colors?: string[];
  onItemClick?: (item: DoughnutChartItem, index: number) => void;
  tooltipContent?: (item: DoughnutChartItem, index: number) => ReactNode;
}

const SEGMENT_COLORS = [
  "#2E8B57",
  "#4A8EDB",
  "#AB7AE0",
  "#FF8A4C",
  "#E85D75",
  "#00A6A6",
  "#8C9EFF",
  "#F4B400",
];

export default function DoughnutChart({
  data,
  size = 280,
  thickness = 34,
  formatValue = (value) => value.toLocaleString(),
  centerLabel,
  centerValue,
  colors,
  onItemClick,
  tooltipContent,
}: DoughnutChartProps) {
  const theme = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = Math.max(data.reduce((sum, item) => sum + item.value, 0), 0);
  const radius = size / 2 - thickness / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    if (total === 0) {
      return [];
    }

    let cumulativeRatio = 0;

    return data.map((item, index) => {
      const ratio = item.value / total;
      const dashLength = circumference * ratio;
      const dashOffset = circumference * (1 - cumulativeRatio);

      cumulativeRatio += ratio;

      const palette = colors ?? SEGMENT_COLORS;
      return {
        ...item,
        color: palette[index % palette.length],
        dashLength,
        dashOffset,
      };
    });
  }, [circumference, colors, data, total]);

  const activeIndex = hoveredIndex ?? 0;
  const activeItem = data[activeIndex];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: `${size}px 1fr` },
        gap: 3,
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box sx={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={theme.palette.action.hover}
              strokeWidth={thickness}
            />
            {segments.map((segment, index) => {
              const isHovered = hoveredIndex === index;

              return (
                <Tooltip
                  key={segment.label}
                  title={
                    tooltipContent ? (
                      tooltipContent(segment, index)
                    ) : (
                      <Box sx={{ px: 0.5, py: 0.2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                          {formatValue(segment.value)}
                        </Typography>
                        <Typography
                          sx={{ fontSize: 10, color: "rgba(255,255,255,0.7)", mt: 0.2 }}
                        >
                          {segment.label}
                        </Typography>
                      </Box>
                    )
                  }
                  placement="top"
                  arrow
                >
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={isHovered ? thickness + 4 : thickness}
                    strokeDasharray={`${segment.dashLength} ${circumference - segment.dashLength}`}
                    strokeDashoffset={segment.dashOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{
                      cursor: onItemClick ? "pointer" : "default",
                      opacity: hoveredIndex !== null && !isHovered ? 0.55 : 1,
                      transition: "opacity 0.2s ease, stroke-width 0.2s ease",
                    }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => onItemClick?.(segment, index)}
                  />
                </Tooltip>
              );
            })}
          </svg>

          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              px: 4,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.disabled" }}>
              {centerLabel ?? activeItem?.label ?? "No data"}
            </Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "text.primary", mt: 0.5 }}>
              {centerValue ?? (activeItem ? formatValue(activeItem.value) : formatValue(0))}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const isHovered = hoveredIndex === index;

          return (
            <Box
              key={item.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onItemClick?.(item, index)}
              sx={{
                display: "grid",
                gridTemplateColumns: "16px minmax(0, 1fr) auto auto",
                gap: 1.2,
                alignItems: "center",
                px: 1,
                py: 0.8,
                borderRadius: 2,
                cursor: onItemClick ? "pointer" : "default",
                bgcolor: isHovered ? "action.hover" : "transparent",
                transition: "background-color 0.2s ease",
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: (colors ?? SEGMENT_COLORS)[index % (colors ?? SEGMENT_COLORS).length],
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "text.primary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Typography>
                {item.sublabel ? (
                  <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                    {item.sublabel}
                  </Typography>
                ) : null}
              </Box>
              <Typography sx={{ fontSize: 12, color: "text.disabled", fontWeight: 700 }}>
                {percentage.toFixed(1)}%
              </Typography>
              <Typography sx={{ fontSize: 13, color: "text.primary", fontWeight: 800 }}>
                {formatValue(item.value)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

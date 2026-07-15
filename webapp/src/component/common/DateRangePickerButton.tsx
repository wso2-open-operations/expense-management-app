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
import { Box, Button, Popover, Typography, useTheme } from "@wso2/oxygen-ui";
import dayjs, { type Dayjs } from "dayjs";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

interface DateRangePickerButtonProps {
  fromDate: Dayjs;
  toDate: Dayjs;
  onFromChange: (d: Dayjs) => void;
  onToChange: (d: Dayjs) => void;
  maxTo?: Dayjs;
}

export default function DateRangePickerButton({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  maxTo,
}: DateRangePickerButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  const inputStyle: React.CSSProperties = {
    width: 140,
    height: 34,
    padding: "0 10px",
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
    fontSize: 13,
    fontFamily: "inherit",
    color: theme.palette.text.primary,
    colorScheme: theme.palette.mode,
    outline: "none",
    cursor: "pointer",
    boxSizing: "border-box",
  };

  const rangeLabel = `${fromDate.format("DD MMM YYYY")} – ${toDate.format("DD MMM YYYY")}`;

  return (
    <>
      <Button
        type="button"
        aria-label={`Date range: ${rangeLabel}`}
        aria-expanded={open}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 0.6,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: open ? "primary.main" : "divider",
          color: open ? "primary.main" : "text.secondary",
          bgcolor: open ? "action.selected" : "background.paper",
          transition: "all 0.15s ease",
          textTransform: "none",
          minWidth: 0,
          "&:hover": { borderColor: "primary.main", color: "primary.main", bgcolor: open ? "action.selected" : "background.paper" },
          whiteSpace: "nowrap",
        }}
      >
        <CalendarDays size={14} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "inherit", lineHeight: 1 }}>
          {rangeLabel}
        </Typography>
      </Button>

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
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            },
          },
        }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", mb: 1.5, textTransform: "uppercase", letterSpacing: 0.6 }}>
          Date range
        </Typography>

        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>From</Typography>
            <input
              type="date"
              aria-label="From date"
              value={fromDate.format("YYYY-MM-DD")}
              max={toDate.format("YYYY-MM-DD")}
              onChange={(e) => {
                const d = dayjs(e.target.value);
                if (!d.isValid()) return;
                onFromChange(d.isAfter(toDate) ? toDate : d);
              }}
              style={inputStyle}
            />
          </Box>

          <Typography sx={{ fontSize: 14, color: "text.disabled", pb: 0.3 }}>→</Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>To</Typography>
            <input
              type="date"
              aria-label="To date"
              value={toDate.format("YYYY-MM-DD")}
              min={fromDate.format("YYYY-MM-DD")}
              max={maxTo?.format("YYYY-MM-DD")}
              onChange={(e) => {
                const d = dayjs(e.target.value);
                if (!d.isValid()) return;
                onToChange(d.isBefore(fromDate) ? fromDate : d);
              }}
              style={inputStyle}
            />
          </Box>
        </Box>
      </Popover>
    </>
  );
}

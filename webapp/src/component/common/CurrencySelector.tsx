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

import { Box, MenuItem, Popover, Typography, useTheme } from "@wso2/oxygen-ui";
import { ChevronDown } from "@wso2/oxygen-ui-icons-react";

import { useState } from "react";

import { CURRENCIES, CURRENCY_OPTIONS, type CurrencyCode } from "@utils/currency";

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export default function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  const selected = CURRENCIES[value];

  return (
    <>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setAnchorEl(e.currentTarget as HTMLElement);
          }
        }}
        role="button"
        tabIndex={0}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.8,
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          cursor: "pointer",
          userSelect: "none",
          "&:hover": { bgcolor: "action.hover" },
          transition: "all 0.2s ease",
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
          {selected.symbol}
        </Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
          {selected.code}
        </Typography>
        <ChevronDown size={14} style={{ color: theme.palette.text.secondary }} />
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 140,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: 3,
            },
          },
        }}
      >
        {CURRENCY_OPTIONS.map((code) => {
          const info = CURRENCIES[code];

          return (
            <MenuItem
              key={code}
              onClick={() => {
                onChange(code);
                setAnchorEl(null);
              }}
              sx={{
                display: "flex",
                gap: 1,
                fontSize: 13,
                fontWeight: code === value ? 700 : 400,
                color: code === value ? "primary.main" : "text.primary",
                bgcolor: code === value ? "action.selected" : "transparent",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 700, minWidth: 20 }}>
                {info.symbol}
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{info.code}</Typography>
            </MenuItem>
          );
        })}
      </Popover>
    </>
  );
}

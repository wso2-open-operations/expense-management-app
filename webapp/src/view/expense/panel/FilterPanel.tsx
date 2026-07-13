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
import { ChevronDown } from "lucide-react";

import { useState } from "react";

import { type ExpenseFilters, FILTER_OPTIONS } from "../data/mockData";

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography
        sx={{ fontSize: 12, fontWeight: 600, color: "text.disabled", letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 0.25,
          py: 0.9,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "transparent",
          cursor: "pointer",
          userSelect: "none",
          minWidth: 160,
          justifyContent: "space-between",
          "&:hover": { borderColor: "text.secondary" },
        }}
      >
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: value ? "text.primary" : "text.disabled",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value || "Select..."}
        </Typography>
        <ChevronDown size={16} style={{ color: theme.palette.text.secondary, flexShrink: 0 }} />
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
              minWidth: 180,
              maxHeight: 240,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: 3,
            },
          },
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option}
            onClick={() => {
              onChange(option);
              setAnchorEl(null);
            }}
            sx={{
              fontSize: 13,
              fontWeight: option === value ? 700 : 400,
              color: option === value ? "primary.main" : "text.primary",
              bgcolor: option === value ? "action.selected" : "transparent",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            {option}
          </MenuItem>
        ))}
      </Popover>
    </Box>
  );
}

interface FilterPanelProps {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
}

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const updateFilter = (key: keyof ExpenseFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        gap: 1.5,
      }}
    >
      <FilterDropdown
        label="Department"
        value={filters.department}
        options={FILTER_OPTIONS.departments}
        onChange={(v) => updateFilter("department", v)}
      />
      <FilterDropdown
        label="Expense Type"
        value={filters.category}
        options={FILTER_OPTIONS.expenseCategories}
        onChange={(v) => updateFilter("category", v)}
      />
      <FilterDropdown
        label="Business Unit"
        value={filters.businessUnit}
        options={FILTER_OPTIONS.businessUnits}
        onChange={(v) => updateFilter("businessUnit", v)}
      />
    </Box>
  );
}

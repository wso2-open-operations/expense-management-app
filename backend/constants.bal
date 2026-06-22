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

public const string STATUS_REJECTED = "-1";
public const string STATUS_DRAFT = "0";
public const string STATUS_SUBMITTED = "1";
public const string STATUS_LEAD_APPROVED = "2";
public const string STATUS_FINANCE_APPROVED = "3";

// Grouped status arrays used by summary queries
public final string[] & readonly PENDING_STATUSES = [STATUS_DRAFT, STATUS_SUBMITTED];
public final string[] & readonly APPROVED_STATUSES = [STATUS_LEAD_APPROVED, STATUS_FINANCE_APPROVED];
public final string[] & readonly REJECTED_STATUSES = [STATUS_REJECTED];

public const int TOP_EMPLOYEES_LIMIT = 7;
public const int TOP_LEADS_LIMIT = 7;
public const int EXPENSE_TYPES_FETCH_LIMIT = 500;


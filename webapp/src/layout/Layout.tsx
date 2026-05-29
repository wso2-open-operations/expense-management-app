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

import { useAuthContext } from "@asgardeo/auth-react";
import {
  AppShell,
  Box,
  ColorSchemeToggle,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import { LogOut, Settings, ShieldUser, UserRound } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useMemo, useState } from "react";

import Logo from "@assets/images/pulse-orange.svg";
import ChartPeriodFilter from "@component/chart/ChartPeriodFilter";
import { useViewMode } from "@context/ViewModeContext";
import { Role } from "@slices/authSlice/auth";
import { RootState, useAppSelector } from "@slices/store";
import { getActiveRouteDetails } from "@src/route";

const resolveProfileImage = (...candidates: Array<string | null | undefined>): string | null => {
  for (const candidate of candidates) {
    const value = candidate?.trim();

    if (!value) {
      continue;
    }

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:image/") ||
      value.startsWith("/")
    ) {
      return value;
    }

    if (/^[A-Za-z0-9+/=]+$/.test(value)) {
      return `data:image/jpeg;base64,${value}`;
    }

    return value;
  }

  return null;
};

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { viewMode, setViewMode } = useViewMode();

  const { signOut, state: authState } = useAuthContext();
  const employeeInfo = useAppSelector((state) => state.user.userInfo);
  const authUserInfo = useAppSelector((state: RootState) => state.auth.userInfo) as
    | Record<string, unknown>
    | null;
  const decodedIdToken = useAppSelector((state: RootState) => state.auth.decodedIdToken) as
    | Record<string, unknown>
    | null;
  const firstName = employeeInfo?.firstName?.trim();
  const lastName = employeeInfo?.lastName?.trim();
  const userName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    (typeof authUserInfo?.displayName === "string" ? authUserInfo.displayName : null) ||
    (typeof authUserInfo?.username === "string" ? authUserInfo.username : null) ||
    authState?.displayName ||
    authState?.username ||
    "User";
  const userEmail = employeeInfo?.workEmail || authState?.email || "";
  const profileImage = resolveProfileImage(
    employeeInfo?.employeeThumbnail,
    employeeInfo?.avatar,
    typeof authUserInfo?.picture === "string" ? authUserInfo.picture : null,
    typeof authUserInfo?.profileUrl === "string" ? authUserInfo.profileUrl : null,
    typeof authUserInfo?.profileImage === "string" ? authUserInfo.profileImage : null,
    typeof authUserInfo?.image === "string" ? authUserInfo.image : null,
    typeof authUserInfo?.photo === "string" ? authUserInfo.photo : null,
    typeof authUserInfo?.avatar === "string" ? authUserInfo.avatar : null,
    typeof decodedIdToken?.picture === "string" ? decodedIdToken.picture : null,
    typeof decodedIdToken?.profileUrl === "string" ? decodedIdToken.profileUrl : null,
    typeof decodedIdToken?.avatar === "string" ? decodedIdToken.avatar : null,
  );

  const allRoutes = useMemo(() => getActiveRouteDetails([Role.ADMIN, Role.EMPLOYEE]), []);
  const activeItem = useMemo(() => {
    const currentRoute = allRoutes.find((r) => r.path === location.pathname);
    return currentRoute?.path ?? "/";
  }, [allRoutes, location.pathname]);

  const handleSelect = (id: string) => {
    navigate(id);
  };

  return (
    <AppShell>
      {/* Header */}
      <AppShell.Navbar>
        <Header minimal>
          <Header.Toggle collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
          <Header.Brand>
            <Header.BrandLogo>
              <img
                src={Logo}
                alt="App Logo"
                style={{
                  height: 35,
                  width: 40,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Header.BrandLogo>
            <span
              style={{
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              Expense Management Dashboard
            </span>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ChartPeriodFilter
              value={viewMode}
              options={[
                { value: "admin", label: "Admin View" },
                { value: "employee", label: "Employee View" },
              ]}
              onChange={(v) => setViewMode(v as "admin" | "employee" | "lead")}
            />
            <ColorSchemeToggle />
            <UserMenu>
              <UserMenu.Trigger name={userName} avatar={profileImage ?? undefined} />
              <UserMenu.Header
                name={userName}
                email={userEmail}
                avatar={profileImage}
                role="Finance Admin"
              />
              <UserMenu.Item
                icon={<UserRound size={18} />}
                label="Profile"
                onClick={() => navigate("/profile")}
              />
              <UserMenu.Item
                icon={<Settings size={18} />}
                label="Settings"
                onClick={() => navigate("/settings")}
              />
              <UserMenu.Item
                icon={<ShieldUser size={18} />}
                label="Admin Panel"
                onClick={() => navigate("/admin")}
              />
              <UserMenu.Divider />
              <UserMenu.Item icon={<LogOut size={18} />} label="Logout" onClick={signOut} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </AppShell.Navbar>

      {/* Sidebar */}
      <AppShell.Sidebar>
        <Sidebar collapsed={collapsed} activeItem={activeItem} onSelect={(id) => handleSelect(id)}>
          <Sidebar.Nav>
            <Sidebar.Category>
              <Sidebar.CategoryLabel>Menu</Sidebar.CategoryLabel>
              {allRoutes
                .filter((route) => !route.bottomNav && !route.children?.length)
                .map((route) => (
                  <Sidebar.Item key={route.path} id={route.path}>
                    <Sidebar.ItemIcon>{route.icon}</Sidebar.ItemIcon>
                    <Sidebar.ItemLabel>{route.text}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                ))}

              {allRoutes
                .filter((route) => !route.bottomNav && route.children?.length)
                .map((route) => (
                  <Sidebar.Item key={route.path} id={route.path}>
                    <Sidebar.ItemIcon>{route.icon}</Sidebar.ItemIcon>
                    <Sidebar.ItemLabel>{route.text}</Sidebar.ItemLabel>
                    {route.children?.map((child) => (
                      <Sidebar.Item
                        key={`${route.path}/${child.path}`}
                        id={`${route.path}/${child.path}`}
                      >
                        <Sidebar.ItemIcon>{child.icon}</Sidebar.ItemIcon>
                        <Sidebar.ItemLabel>{child.text}</Sidebar.ItemLabel>
                      </Sidebar.Item>
                    ))}
                  </Sidebar.Item>
                ))}
            </Sidebar.Category>
          </Sidebar.Nav>

          {/* Bottom nav items */}
          <Sidebar.Footer>
            {allRoutes
              .filter((route) => route.bottomNav)
              .map((route) => (
                <Sidebar.Item key={route.path} id={route.path}>
                  <Sidebar.ItemIcon>{route.icon}</Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>{route.text}</Sidebar.ItemLabel>
                </Sidebar.Item>
              ))}
          </Sidebar.Footer>
        </Sidebar>
      </AppShell.Sidebar>

      {/* Main Content */}
      <AppShell.Main>
        <Box
          sx={{
            p: 2,
            width: "100%",
            maxWidth: "100%",
            height: "100%",
            boxSizing: "border-box",
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.3s ease-in-out",
          }}
        >
          <Outlet />
        </Box>
      </AppShell.Main>

      {/* Footer */}
      <AppShell.Footer>
        <Footer>
          <Footer.Copyright>© 2026 WSO2 LLC. All rights reserved.</Footer.Copyright>
          <Footer.Divider />
          <Footer.Link href="/terms">Terms & Conditions</Footer.Link>
          <Footer.Link href="/privacy">Privacy Policy</Footer.Link>
        </Footer>
      </AppShell.Footer>
    </AppShell>
  );
}

export default Layout;

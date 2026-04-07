/**
 * Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Alert, Box, Button, Link, Typography } from "@wso2/oxygen-ui";
import { ArrowRight } from "@wso2/oxygen-ui-icons-react";

import { type JSX, useState } from "react";

import { useAppAuthContext } from "@context/AuthContext";

export default function LoginBox(): JSX.Element {
  const [error] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { appSignIn } = useAppAuthContext();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await appSignIn();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
          Login to Account
        </Typography>
        <Typography sx={{ color: "text.secondary", maxWidth: 420, fontSize: 16, lineHeight: 1.6 }}>
          Ready to explore? Continue with your account to proceed.
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ my: 2 }}>
          You are about to access a non-secure site. Proceed with caution!
        </Alert>
      )}

      <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 3 }}>
        <Button
          variant="contained"
          type="submit"
          disabled={isSubmitting}
          sx={{
            mt: 0.5,
            minHeight: 48,
            width: "100%",
            maxWidth: 300,
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 600,
            textTransform: "none",
            background: "linear-gradient(90deg, #ff7a18 0%, #ff4d2d 100%)",
            boxShadow: "none",
            alignSelf: "flex-start",
            "&:hover": {
              boxShadow: "none",
              background: "linear-gradient(90deg, #ff7a18 0%, #ff4d2d 100%)",
              opacity: 0.95,
            },
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <span>{isSubmitting ? "Continuing..." : "Continue"}</span>
            <ArrowRight size={18} />
          </Box>
        </Button>
      </Box>

      <Box
        component="footer"
        sx={{
          mt: { xs: 7, md: 12 },
          display: "flex",
          flexDirection: "column",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 1.5,
        }}
      >
        <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
          © Copyright {new Date().getFullYear()} WSO2 LLC.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Link href="" underline="hover" sx={{ color: "text.secondary", fontSize: 14 }}>
            Privacy Policy
          </Link>
          <Link href="" underline="hover" sx={{ color: "text.secondary", fontSize: 14 }}>
            Terms of Use
          </Link>
        </Box>
      </Box>
    </form>
  );
}

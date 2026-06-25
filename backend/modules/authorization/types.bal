import ballerina/jwt;

# User information extracted from the Asgardeo JWT assertion (Minimal version).
public type CustomJwtPayload record {
    # Work email address of the authenticated user
    string email;
    # Group or role names assigned to the authenticated user
    string|string[] groups = [];
};

# Full profile data extracted directly from Asgardeo (Including thumbnail).
public type AsgardeoProfile record {
    *jwt:Payload;

    # Work email address of the authenticated user
    string email;
    # Normalized group names assigned to the authenticated user
    string|string[] groups;
    # First name extracted from Asgardeo
    string given_name;
    # Last name extracted from Asgardeo
    string family_name;
    # Optional profile thumbnail URL or string
    string profile?;
};

# Normalized User Info stored in the request context for your application logic
public type UserInfo record {|
    string email;
    string[] groups;
    string givenName;
    string familyName;
    string? thumbnail; // Maps to the 'profile' field from Asgardeo
|};

# Application-specific role names used for authorization checks.
public type AppRoles record {|
    # Role granted to employees
    string employeeRole;
    # Role granted to finance administrators
    string financeAdminRole;
|};
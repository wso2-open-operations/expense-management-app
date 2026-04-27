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
import ballerina/http;
import ballerina/jwt;
import ballerina/log;

public configurable AppRoles authorizedRoles = ?;

# To handle authorization for each resource function invocation.
public isolated service class JwtInterceptor {

    *http:RequestInterceptor;

    # Intercept incoming requests and attach validated user information to the request context.
    #
    # + ctx - Request context used to share authenticated user information
    # + req - Incoming HTTP request
    # + return - Next service when authorization succeeds, otherwise an HTTP error response
    isolated resource function default [string... path](http:RequestContext ctx, http:Request req)
        returns http:NextService|http:Forbidden|http:InternalServerError|error? {

        string|error idToken = req.getHeader(JWT_ASSERTION_HEADER);

        if idToken is error {
            string errorMsg = "Missing invoker info header!";
            log:printError(errorMsg, idToken);
            return <http:InternalServerError>{
                body: {
                    message: errorMsg
                }
            };
        }

        [jwt:Header, jwt:Payload]|jwt:Error result = jwt:decode(idToken);
        if result is jwt:Error {
            string errorMsg = "Error while reading the Invoker info!";
            log:printError(errorMsg, result);
            return <http:InternalServerError>{body: {message: errorMsg}};
        }

        CustomJwtPayload|error userInfo = result[1].cloneWithType(CustomJwtPayload);
        if userInfo is error {
            string errorMsg = "Malformed Invoker info object!";
            log:printError(errorMsg, userInfo);
            return <http:InternalServerError>{body: {message: errorMsg}};
        }

        string|string[] groups = userInfo.groups;
        UserInfo userInfoHeader = {
            email: userInfo.email,
            groups: groups is string[] ? groups : [groups]
        };
        foreach anydata role in authorizedRoles.toArray() {
            if userInfoHeader.groups.some(r => r === role) {
                ctx.set(HEADER_USER_INFO, userInfoHeader);
                return ctx.next();
            }
        }

        return <http:Forbidden>{body: {message: "Insufficient privileges!"}};
    }
}

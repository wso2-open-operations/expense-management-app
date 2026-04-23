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

        // Convert the decoded payload to a plain JSON map so custom claims
        // (email, groups) are accessed as json rather than anydata, avoiding
        // cloneWithType failures when groups is a json[] or absent.
        json payloadJson = result[1].toJson();
        if payloadJson !is map<json> {
            string errorMsg = "Malformed Invoker info object!";
            log:printError(errorMsg + ": JWT payload is not a JSON object");
            return <http:InternalServerError>{body: {message: errorMsg}};
        }
        map<json> claims = payloadJson;

        // email is required
        json emailClaim = claims["email"];
        if emailClaim !is string {
            string errorMsg = "Malformed Invoker info object!";
            log:printError(errorMsg + ": 'email' claim missing or not a string");
            return <http:InternalServerError>{body: {message: errorMsg}};
        }

        // groups may be a json array, a bare string, or absent — handle all cases
        string[] groups = [];
        json groupsClaim = claims["groups"];
        if groupsClaim is json[] {
            foreach json g in groupsClaim {
                if g is string {
                    groups.push(g);
                }
            }
        } else if groupsClaim is string {
            groups = [groupsClaim];
        }

        CustomJwtPayload userInfo = {email: emailClaim, groups: groups};

        foreach anydata role in authorizedRoles.toArray() {
            if userInfo.groups.some(r => r === role) {
                ctx.set(HEADER_USER_INFO, userInfo);
                return ctx.next();
            }
        }

        return <http:Forbidden>{body: {message: "Insufficient privileges!"}};
    }
}

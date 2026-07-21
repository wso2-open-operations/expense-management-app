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

import ballerina/cache;
import ballerina/test;

// Mocks the HR entity HTTP call directly, since `hrClient` is `final` and
// cannot be reassigned/mocked as an object from the test module.
@test:Mock { functionName: "fetchEmployeeBatch" }
test:MockFunction fetchEmployeeBatchMock = new ();

@test:BeforeSuite
function beforeSuite() {
    test:when(fetchEmployeeBatchMock).thenReturn(<Employee[]>[
        {firstName: "John", lastName: "Doe", employeeThumbnail: (), email: "john.doe@wso2.com"},
        {firstName: "Jane", lastName: "Smith", employeeThumbnail: (), email: "jane.smith@wso2.com"}
    ]);
}

@test:Config {}
function testFetchEmployeeNameMapWithCache() returns error? {
    lock {
        cache:Error? cacheErr = employeeNameCache.put("clark.kent@wso2.com", "Clark Kent");
        test:assertTrue(cacheErr is (), "failed to pre-populate cache for test");
    }

    map<string> nameMap = check fetchEmployeeNameMap(["clark.kent@wso2.com", "john.doe@wso2.com"]);

    test:assertEquals(nameMap["clark.kent@wso2.com"], "Clark Kent");
    test:assertEquals(nameMap["john.doe@wso2.com"], "John Doe");
}

@test:Config {}
function testFetchEmployeeNameMapEmptyInputs() returns error? {
    map<string> nameMap = check fetchEmployeeNameMap([" ", ""]);
    test:assertEquals(nameMap.length(), 0);
}


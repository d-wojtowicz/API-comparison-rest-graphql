// Test script for role-based field filtering across different models
import { filterUserFields } from '../rest/utils/permissions.js';

// Test configuration for different models
const testConfigs = {
  user: {
    name: 'User Model',
    mockData: {
      user_id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword123',
      role: 'user',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02')
    },
    testCases: [
      {
        name: 'Superadmin viewing user data',
        requestingUser: { role: 'superadmin' },
        expectedFields: ['user_id', 'username', 'email', 'password_hash', 'role', 'created_at', 'updated_at']
      },
      {
        name: 'Admin viewing user data',
        requestingUser: { role: 'admin' },
        expectedFields: ['user_id', 'username', 'email', 'role', 'created_at', 'updated_at']
      },
      {
        name: 'Regular user viewing user data',
        requestingUser: { role: 'user' },
        expectedFields: ['user_id', 'username', 'email']
      }
    ],
    filterFunction: filterUserFields
  }
  // TODO: More models should be added here in the future
  // task: {
  //   name: 'Task Model',
  //   mockData: { ... },
  //   testCases: [ ... ],
  //   filterFunction: filterTaskFields
  // },
  // project: {
  //   name: 'Project Model',
  //   mockData: { ... },
  //   testCases: [ ... ],
  //   filterFunction: filterProjectFields
  // }
};

function runModelTests(modelKey, config) {
  console.log(`=== Testing ${config.name} ===\n`);

  config.testCases.forEach(testCase => {
    console.log(`\n${testCase.name}:`);
    
    const filteredData = config.filterFunction(config.mockData, testCase.requestingUser);
    
    console.log('Filtered data:', filteredData);
    console.log('Expected fields:', testCase.expectedFields);
    
    const actualFields = Object.keys(filteredData);
    const hasExpectedFields = testCase.expectedFields.every(field => actualFields.includes(field));
    const hasUnexpectedFields = actualFields.some(field => !testCase.expectedFields.includes(field));
    
    if (hasExpectedFields && !hasUnexpectedFields) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL');
      if (!hasExpectedFields) {
        console.log('Missing expected fields:', testCase.expectedFields.filter(field => !actualFields.includes(field)));
      }
      if (hasUnexpectedFields) {
        console.log('Unexpected fields:', actualFields.filter(field => !testCase.expectedFields.includes(field)));
      }
    }
  });
}

function runAllTests() {
  console.log('Testing role-based field filtering across all models...\n');

  Object.entries(testConfigs).forEach(([modelKey, config]) => {
    runModelTests(modelKey, config);
  });

  console.log('\nAll tests completed!');
}

runAllTests(); 
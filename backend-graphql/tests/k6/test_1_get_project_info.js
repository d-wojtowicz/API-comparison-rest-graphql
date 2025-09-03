import http from 'k6/http';
import { check, sleep } from 'k6';

const VUs = 500;

// Stage tracking utility - synchronized with k6 stages
let testStartTime = Date.now();

function getCurrentStage() {
  const elapsed = Date.now() - testStartTime;
  
  // Match the actual k6 stages configuration
  if (elapsed < 10000) {
    return 1; // Stage 1: Ramp up to 500 VUs (0-10s)
  } else {
    return 2; // Stage 2: Hold 500 VUs (10s+)
  }
}


// Konfiguracja testu
export const options = {
  stages: [
    { duration: '10s', target: VUs },
    { duration: '30s', target: VUs },
  ],
};

const BASE_URL = 'http://[::1]:4002';
const PROJECT_ID = 1;
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWxpY2Uuc21pdGhAZXhhbXBsZS5jb20iLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc1NjgzODk5NiwiZXhwIjoxNzU2ODQyNTk2fQ.QSHCqDNecyYbFhbfLfEZPp5NTM54FFxZjOAgYQnpZjk';

const GRAPHQL_QUERY = `
  query GetProject($id: ID!) {
    project(id: $id) {
      project_id
      project_name
      description
      created_at
      updated_at
      owner_id
    }
  }
`;

export default function () {
  const url = `${BASE_URL}/graphql`;
  
  const headers = {
    'authorization': `Bearer ${AUTH_TOKEN}`,
    'content-type': 'application/json',
  };

  const payload = JSON.stringify({
    query: GRAPHQL_QUERY,
    variables: {
      id: PROJECT_ID.toString()
    }
  });

  // Get current stage and add tags
  const stage = getCurrentStage();
  
  const response = http.post(url, payload, { 
    headers,
    tags: {
      stage: stage.toString(),
      stage_name: `stage_${stage}`,
      api_type: 'graphql'
    }
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
    'correct project returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data?.project?.project_id === PROJECT_ID;
      } catch (e) {
        return false;
      }
    },
    'no GraphQL errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch (e) {
        return false;
      }
    },
  });

  if (__ITER < 3) {
    console.log(`Response status: ${response.status}`);
    console.log(`Response time: ${response.timings.duration}ms`);
    if (response.status !== 200) {
      console.log(`Response body: ${response.body}`);
    }
  }

  sleep(1);
}

export function handleSummary(data) {
  const safeFormat = (value, decimals = 2) => {
    return value !== null && value !== undefined ? value.toFixed(decimals) : 'N/A';
  };

  const summary = {
    test_name: 'GraphQL Project Load Test',
    endpoint: `/graphql`,
    project_id: PROJECT_ID,
    test_duration_ms: data.state?.testRunDurationMs || 0,
    total_requests: data.metrics?.http_reqs?.values?.count || 0,
    total_errors: data.metrics?.http_req_failed?.values?.count || 0,
    error_rate: `${safeFormat((data.metrics?.http_req_failed?.values?.rate || 0) * 100)}%`,
    response_times: {
      average: `${safeFormat(data.metrics?.http_req_duration?.values?.avg)}ms`,
      min: `${safeFormat(data.metrics?.http_req_duration?.values?.min)}ms`,
      max: `${safeFormat(data.metrics?.http_req_duration?.values?.max)}ms`,
      p90: `${safeFormat(data.metrics?.http_req_duration?.values?.['p(90)'])}ms`,
      p95: `${safeFormat(data.metrics?.http_req_duration?.values?.['p(95)'])}ms`,
    },
    throughput: {
      requests_per_second: safeFormat(data.metrics?.http_reqs?.values?.rate),
    },
    concurrent_users: {
      max: data.metrics?.vus_max?.values?.max || 0,
      avg: safeFormat(data.metrics?.vus?.values?.avg),
    },
    timestamp: new Date().toISOString(),
  };

  const fileName = `../performance-analytics/summary/graphql/1_get_project_info.json`;
  return {
    [fileName]: JSON.stringify(summary, null, 2),
  };
}

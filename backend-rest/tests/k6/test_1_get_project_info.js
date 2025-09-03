import http from 'k6/http';
import { check, sleep } from 'k6';

// Stage tracking utility - synchronized with k6 stages
let testStartTime = Date.now();

function getCurrentStage() {
  const elapsed = Date.now() - testStartTime;
  
  // Match the actual k6 stages configuration
  if (elapsed < 30000) {
    return 1; // Stage 1: Ramp up to 50 VUs (0-30s)
  } else if (elapsed < 75000) {
    return 2; // Stage 2: Hold 50 VUs (30-75s)
  } else if (elapsed < 105000) {
    return 3; // Stage 3: Ramp up to 100 VUs (75-105s)
  } else if (elapsed < 150000) {
    return 4; // Stage 4: Hold 100 VUs (105-150s)
  } else if (elapsed < 180000) {
    return 5; // Stage 5: Ramp up to 200 VUs (150-180s)
  } else if (elapsed < 225000) {
    return 6; // Stage 6: Hold 200 VUs (180-225s)
  } else if (elapsed < 255000) {
    return 7; // Stage 7: Ramp up to 500 VUs (225-255s)
  } else if (elapsed < 300000) {
    return 8; // Stage 8: Hold 500 VUs (255-300s)
  } else if (elapsed < 330000) {
    return 9; // Stage 9: Ramp up to 1000 VUs (300-330s)
  } else if (elapsed < 375000) {
    return 10; // Stage 10: Hold 1000 VUs (330-375s)
  } else {
    return 11; // Stage 11: Ramp down to 0 VUs (375s+)
  }
}

// Konfiguracja testu
export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '45s', target: 50 },
    { duration: '30s', target: 100 }, 
    { duration: '45s', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '45s', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '45s', target: 500 },
    { duration: '30s', target: 1000 },
    { duration: '45s', target: 1000 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = 'http://[::1]:4001';
const PROJECT_ID = 1;
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWxpY2Uuc21pdGhAZXhhbXBsZS5jb20iLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc1NjkyMTY3MSwiZXhwIjoxNzU2OTI1MjcxfQ.w3vBd32alHXmcU3p1jC1QsyobYNjMf8n9j0FDThxeVo';
export default function () {
  const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}`;
  
  const headers = {
    'authorization': `Bearer ${AUTH_TOKEN}`,
    'content-type': 'application/json',
  };

  // Get current stage and add tags
  const stage = getCurrentStage();
  
  const response = http.get(url, { 
    headers,
    tags: {
      stage: stage.toString(),
      stage_name: `stage_${stage}`,
      api_type: 'rest'
    }
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
    'correct project returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.project_id === PROJECT_ID;
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
    test_name: 'REST Project Load Test',
    endpoint: `/api/v1/projects/{id}`,
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

  const fileName = `../performance-analytics/summary/rest/1_get_project_info.json`;
  return {
    [fileName]: JSON.stringify(summary, null, 2),
  };
}

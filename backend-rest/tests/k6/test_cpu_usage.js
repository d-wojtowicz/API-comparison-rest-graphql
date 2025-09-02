import http from 'k6/http';
import { check, sleep } from 'k6';

// Konfiguracja testu
export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '25s', target: 50 },
    { duration: '10s', target: 100 }, 
    { duration: '25s', target: 100 },
    { duration: '10s', target: 200 },
    { duration: '25s', target: 200 },
    { duration: '10s', target: 500 },
    { duration: '25s', target: 500 },
    { duration: '10s', target: 1000 },
    { duration: '25s', target: 1000 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = 'http://[::1]:4001';
const PROJECT_ID = 1;
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWxpY2Uuc21pdGhAZXhhbXBsZS5jb20iLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc1NjgzNTYwNywiZXhwIjoxNzU2ODM5MjA3fQ.pPKcW9Oyo5BkwX-0srW6efnmO-gJfpi7xk_WO_hCqTg';

export default function () {
  const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}`;
  
  const headers = {
    'authorization': `Bearer ${AUTH_TOKEN}`,
    'content-type': 'application/json',
  };

  const response = http.get(url, { headers });

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

  return {
    'rest_cpu_usage_summary.json': JSON.stringify(summary, null, 2),
  };
}

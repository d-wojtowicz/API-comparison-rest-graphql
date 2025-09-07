import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Stage tracking utility - synchronized with k6 stages
let testStartTime = Date.now();

function getCurrentStage() {
  const elapsed = Date.now() - testStartTime;
  
  // Match the actual k6 stages configuration
  if (elapsed < 30000) {
    return 1; // Stage 1: Ramp up to 50 VUs (0-30s)
  } else if (elapsed < 150000) {
    return 2; // Stage 2: Hold 50 VUs (30-150s, 2m)
  } else if (elapsed < 180000) {
    return 3; // Stage 3: Ramp up to 100 VUs (150-180s, 30s)
  } else if (elapsed < 300000) {
    return 4; // Stage 4: Hold 100 VUs (180-300s, 2m)
  } else if (elapsed < 330000) {
    return 5; // Stage 5: Ramp up to 200 VUs (300-330s, 30s)
  } else if (elapsed < 450000) {
    return 6; // Stage 6: Hold 200 VUs (330-450s, 2m)
  } else if (elapsed < 480000) {
    return 7; // Stage 7: Ramp up to 500 VUs (450-480s, 30s)
  } else if (elapsed < 600000) {
    return 8; // Stage 8: Hold 500 VUs (480-600s, 2m)
  } else if (elapsed < 630000) {
    return 9; // Stage 9: Ramp up to 750 VUs (600-630s, 30s)
  } else if (elapsed < 750000) {
    return 10; // Stage 10: Hold 750 VUs (630-750s, 2m)
  } else if (elapsed < 780000) {
    return 11; // Stage 11: Ramp up to 1000 VUs (750-780s, 30s)
  } else {
    return 12; // Stage 12: Hold 1000 VUs (780s+, 2m)
  }
}

// Konfiguracja testu
export const options = {  
  stages: [
    { duration: '30s', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '30s', target: 100 }, 
    { duration: '2m', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '2m', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '30s', target: 750 },
    { duration: '2m', target: 750 },
    { duration: '30s', target: 1000 },
    { duration: '2m', target: 1000 },
  ],
};

const BASE_URL = 'http://[::1]:4001';
const TASK_ID = 1;
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWxpY2Uuc21pdGhAZXhhbXBsZS5jb20iLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc1NzI0OTM3NiwiZXhwIjoxNzU3MjUyOTc2fQ.Tytmj2JhxIDVDdROgd8i6aUZNZoSgW6qonnSnpjb_Z8';

export default function () {
  const url = `${BASE_URL}/api/v1/comments/`;
  
  const headers = {
    'authorization': `Bearer ${AUTH_TOKEN}`,
    'content-type': 'application/json',
  };

  // Generate unique comment text using timestamp and random string
  const timestamp = Date.now();
  const randomSuffix = randomString(8);
  const commentText = `Test comment for load testing - ${timestamp} - ${randomSuffix}. This is a performance test comment.`;

  const payload = JSON.stringify({
    task_id: TASK_ID,
    comment_text: commentText
  });

  // Get current stage and add tags
  const stage = getCurrentStage();
  
  const response = http.post(url, payload, { 
    headers,
    tags: {
      stage: stage.toString(),
      stage_name: `stage_${stage}`,
      api_type: 'rest'
    }
  });

  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 1s': (r) => r.timings.duration < 1000,
    'response has comment_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('comment_id') && 
               typeof body.comment_id === 'number';
      } catch (e) {
        return false;
      }
    },
    'response has correct task_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('task_id') && 
               body.task_id === TASK_ID;
      } catch (e) {
        return false;
      }
    },
    'response has correct user_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('user_id') && 
               body.user_id === 1; // The user ID from the JWT token
      } catch (e) {
        return false;
      }
    },
    'response has correct comment_text': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('comment_text') && 
               body.comment_text === commentText;
      } catch (e) {
        return false;
      }
    },
    'comment_id is positive number': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.comment_id > 0;
      } catch (e) {
        return false;
      }
    },
    'response has required fields': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('comment_text') && 
               body.hasOwnProperty('created_at');
      } catch (e) {
        return false;
      }
    },
  });

  if (__ITER < 3) {
    console.log(`Response status: ${response.status}`);
    console.log(`Response time: ${response.timings.duration}ms`);
    console.log(`Created comment for task ${TASK_ID}: ${commentText.substring(0, 50)}...`);
    if (response.status !== 201) {
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
    test_name: 'REST Create Comment Load Test',
    endpoint: `POST /api/v1/comments/`,
    task_id: TASK_ID,
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

  const fileName = `../performance-analytics/summary/rest/8_create_comment_for_specific_task.json`;
  return {
    [fileName]: JSON.stringify(summary, null, 2),
  };
}

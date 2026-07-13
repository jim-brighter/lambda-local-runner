import assert from 'node:assert';
import { spawn } from 'node:child_process';
import http from 'node:http';

// --- Section 1: Unit Test of matchPath function ---
function matchPath(template, path) {
  const tClean = template.replace(/\/+$/, '') || '/';
  const pClean = path.replace(/\/+$/, '') || '/';

  const tParts = tClean.split('/');
  const pParts = pClean.split('/');

  const params = {};

  for (let i = 0; i < tParts.length; i++) {
    const tPart = tParts[i];
    const pPart = pParts[i];

    if (tPart.startsWith('{') && tPart.endsWith('}')) {
      const isWildcard = tPart.endsWith('+}');
      const paramName = isWildcard ? tPart.slice(1, -2) : tPart.slice(1, -1);

      if (isWildcard) {
        const wildcardValue = pParts.slice(i).join('/');
        params[paramName] = decodeURIComponent(wildcardValue);
        return { matched: true, params };
      }

      if (pPart === undefined) {
        return { matched: false };
      }

      params[paramName] = decodeURIComponent(pPart);
    } else {
      if (tPart !== pPart) {
        return { matched: false };
      }
    }
  }

  if (pParts.length !== tParts.length) {
    return { matched: false };
  }

  return { matched: true, params };
}

console.log('Running unit tests for matchPath...');

// Test cases
assert.deepStrictEqual(matchPath('/users/{userId}', '/users/123'), {
  matched: true,
  params: { userId: '123' }
});

assert.deepStrictEqual(matchPath('/users/{userId}/posts/{postId}', '/users/123/posts/456'), {
  matched: true,
  params: { userId: '123', postId: '456' }
});

assert.deepStrictEqual(matchPath('/users/{userId}', '/users/123/posts/456'), {
  matched: false
});

assert.deepStrictEqual(matchPath('/users/{userId}/posts/{postId}', '/users/123'), {
  matched: false
});

assert.deepStrictEqual(matchPath('/proxy/{proxy+}', '/proxy/some/nested/path'), {
  matched: true,
  params: { proxy: 'some/nested/path' }
});

assert.deepStrictEqual(matchPath('/proxy/{proxy+}', '/proxy/path%2Fwith%2Fspaces'), {
  matched: true,
  params: { proxy: 'path/with/spaces' }
});

assert.deepStrictEqual(matchPath('/', '/'), {
  matched: true,
  params: {}
});

assert.deepStrictEqual(matchPath('/items', '/items/'), {
  matched: true,
  params: {}
});

console.log('Unit tests passed!');

// --- Section 2: Integration tests ---
console.log('Running integration tests...');

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: JSON.parse(data)
      }));
    }).on('error', reject);
  });
}

const runServer = (args, env = {}) => {
  return new Promise((resolve) => {
    const proc = spawn('node', ['index.js', ...args], {
      env: { ...process.env, ...env }
    });

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server listening')) {
        resolve(proc);
      }
    });

    proc.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });
  });
};

// Test Case 1: Standard usage with path parameters
const p1 = await runServer([
  'mock-handler.js',
  '-h', 'handler',
  '-p', '/users/{userId}/posts/{postId}',
  '-P', '4001'
]);

try {
  const res1 = await request('http://localhost:4001/users/abc/posts/def?foo=bar');
  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.headers['x-mock'], 'True');
  assert.strictEqual(res1.body.path, '/users/abc/posts/def');
  assert.deepStrictEqual(res1.body.queryStringParameters, { foo: 'bar' });
  assert.deepStrictEqual(res1.body.pathParameters, { userId: 'abc', postId: 'def' });

  // Test non-matching path
  const res2 = await request('http://localhost:4001/users/abc');
  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.body.pathParameters, null);

  console.log('Integration Test 1 passed!');
} finally {
  p1.kill();
}

// Test Case 2: Custom handler and environment variable path templates
const p2 = await runServer([
  'mock-handler.js',
  '--handler=customFunc',
  '--port=4002'
], {
  PATH_TEMPLATES: '/items/{itemId}'
});

try {
  const res = await request('http://localhost:4002/items/999');
  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.custom, true);
  assert.strictEqual(res.body.event.pathParameters.itemId, '999');

  console.log('Integration Test 2 passed!');
} finally {
  p2.kill();
}

console.log('All tests passed successfully!');

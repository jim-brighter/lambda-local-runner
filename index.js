#!/usr/bin/env node

import { createServer } from 'node:http';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);

let handlerFile = null;
let handlerFunc = 'handler';
const pathTemplates = [];
let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--handler' || arg === '-h') {
    handlerFunc = args[++i];
  } else if (arg.startsWith('--handler=')) {
    handlerFunc = arg.substring(10);
  } else if (arg.startsWith('-h=')) {
    handlerFunc = arg.substring(3);
  } else if (arg === '--path' || arg === '-p') {
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      pathTemplates.push(...args[++i].split(','));
    }
  } else if (arg.startsWith('--path=')) {
    pathTemplates.push(...arg.substring(7).split(','));
  } else if (arg.startsWith('-p=')) {
    pathTemplates.push(...arg.substring(3).split(','));
  } else if (arg === '--port' || arg === '-P') {
    port = parseInt(args[++i], 10);
  } else if (arg.startsWith('--port=')) {
    port = parseInt(arg.substring(7), 10);
  } else if (arg.startsWith('-P=')) {
    port = parseInt(arg.substring(3), 10);
  } else if (!arg.startsWith('-')) {
    if (!handlerFile) {
      handlerFile = arg;
    } else {
      console.warn(`Warning: Unexpected extra positional argument ignored: ${arg}`);
    }
  }
}

if (process.env.PATH_TEMPLATES) {
  pathTemplates.push(...process.env.PATH_TEMPLATES.split(','));
}

if (!handlerFile) {
  console.error('Error: Handler file is required.');
  console.error('Usage: lambda-local-runner <handler-file> [options]');
  console.error('\nOptions:');
  console.error('  -h, --handler <func>  Specify the handler function name (default: "handler")');
  console.error('  -p, --path <template> Path templates (comma-separated, can be specified multiple times)');
  console.error('  -P, --port <port>     Port to listen on (default: 3000 or process.env.PORT)');
  process.exit(1);
}

const handlerModule = await jiti.import(`${process.cwd()}/${handlerFile}`);
const handler = handlerModule[handlerFunc];

if (typeof handler !== 'function') {
  console.error(`Error: Function "${handlerFunc}" not found in handler file "${handlerFile}"`);
  process.exit(1);
}

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

const server = createServer(async (req, res) => {
  try {
    const [path, queryParams] = req.url?.split('?') ?? [];

    if (path === '/favicon.ico') {
      res.writeHead(200);
      res.end();
      return;
    }

    const queryStringParameters = queryParams ? Object.fromEntries(queryParams.split('&').map((param) => param.split('='))) : {};

    let pathParameters = null;
    for (const template of pathTemplates) {
      const result = matchPath(template, path);
      if (result.matched) {
        pathParameters = result.params;
        break;
      }
    }

    const event = {
      path,
      pathParameters,
      queryStringParameters
    };

    const response = await handler(event);
    res.writeHead(response.statusCode, {
      'Content-Type': 'application/json',
      ...response.headers
    });
    res.end(response.body);
  } catch (e) {
    console.error(e);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Something went catastrophically wrong');
  }
});

server.listen(port, 'localhost', () => {
  console.log(`Server listening at http://localhost:${port}/`);
});

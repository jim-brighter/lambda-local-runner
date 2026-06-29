#!/usr/bin/env node

import { createServer } from 'node:http';

const port = process.env.PORT ?? 3000;

const handlerFile = process.argv[2];
const handlerFunc = process.argv[3] || 'handler';
const handlerModule = await import(`${process.cwd()}/${handlerFile}`);
const handler = handlerModule[handlerFunc];

const server = createServer(async (req, res) => {
  try {
    const [path, queryParams] = req.url?.split('?');

    if (path === '/favicon.ico') {
      res.writeHead(200);
      res.end();
      return;
    }

    const queryParamsObj = queryParams ? Object.fromEntries(queryParams.split('&').map((param) => param.split('='))) : {};

    const event = {
      queryStringParameters: queryParamsObj
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

# lambda-local-runner
Super simple cli tool for running NodeJS lambda functions locally as a server.

Does not attempt to run any kind of gateway or load balancing layer, but does format events similar to API Gateway.

Uses [jiti](https://www.npmjs.com/package/jiti) for universal compatibility.

### Installation
```bash
npm install --save-dev @jim-brighter/lambda-local-runner
```

### Usage
Provide the handler filename and optional named parameters:

```bash
# Start server for main.ts using default function "handler" on port 3000
npx lambda-local-runner main.ts

# Start server for index.js with a custom handler function name
npx lambda-local-runner index.js --handler customFunc

# Start server on a custom port
npx lambda-local-runner index.js -P 4000
```

### Options
* `-h, --handler <function-name>`: Specify the handler function inside the handler file (default: `handler`).
* `-p, --path <template>`: Define route template(s) to match request paths and populate `pathParameters` in the lambda event. Can be specified multiple times or as a comma-separated list.
* `-P, --port <port>`: Port to listen on (default: `3000` or `process.env.PORT`).

### Path Parameters
By default, `pathParameters` on the incoming lambda event is `null`. If you define route templates, the runner will match the request URL path and extract any named parameters wrapped in curly braces (e.g., `{userId}` or greedy wildcards like `{proxy+}`).

Example:
```bash
npx lambda-local-runner index.js --path "/users/{userId}/posts/{postId}" --path "/public/{proxy+}"
```

A request to `GET /users/123/posts/456` will pass the following to your handler:
```json
{
  "path": "/users/123/posts/456",
  "queryStringParameters": {},
  "pathParameters": {
    "userId": "123",
    "postId": "456"
  }
}
```

A request to `GET /public/assets/css/main.css` will pass:
```json
{
  "path": "/public/assets/css/main.css",
  "queryStringParameters": {},
  "pathParameters": {
    "proxy": "assets/css/main.css"
  }
}
```

You can also specify templates using the `PATH_TEMPLATES` environment variable:
```bash
PATH_TEMPLATES="/items/{id}" npx lambda-local-runner index.js
```

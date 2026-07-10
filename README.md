# lambda-local-runner
Super simple cli tool for running NodeJS lambda functions locally as a server.

Does not attempt to run any kind of gateway or load balancing layer.

Uses [jiti](https://www.npmjs.com/package/jiti) for universal compatibility.

### Installation
```bash
npm install --save-dev @jim-brighter/lambda-local-runner
```

### Usage
Provide the handler filename and function
```bash
npx lambda-local-runner index.js main
```

Defaults to function name "handler" if none provided:
```bash
npx lambda-local-runner main.ts
```

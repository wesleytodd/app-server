# App Server

A wrapper around a common configuration for an express application server.  This module wraps the following modules:

- [Express](https://www.npmjs.com/package/express)
- [Express Compression Middleware](https://www.npmjs.com/package/compression)
- [Express Error Handler Middleware](https://www.npmjs.com/package/errorhandler)
- [Naught](https://www.npmjs.com/package/naught)
- [Express Graceful Exit](https://www.npmjs.com/package/express-graceful-exit)
- [Logtastic](https://www.npmjs.com/package/logtastic)
- [Consolidate](https://www.npmjs.com/package/consolidate)
- [Cookie Parser](https://www.npmjs.com/package/cookie-parser)

It setup sane defaults for these modules and exposes simple confiuration options for tweaking.  But overall it is an opinionated method for setting up an express service.

## Install

```
$ npm install --save app-server
```

## Basic Usage

```javascript
var Server = require('app-server');

// All these options are set to their default values
var server = new Server({
	port: 3000,
	hostname: null,
	logDir: 'log',
	logger: logtastic, // An instance of Logtastic
	trustProxy: true,
	compress: true,
	errorHandler: true,
	parseCookies: false,
	viewDir: null, // Full path to views
	viewEngine: null, // One of the modules provied by consolidate
	viewEngineSuffix: 'html'
});

// Setup routes
server.app.post('/', function(req, res) {
	res.status(200).json({hi: 'planet'});
});

// Start the server
server.start();
```

# App Server

A wrapper around a common configuration for an express application server.  This module wraps the following modules:

- [Express](https://www.npmjs.com/package/express)
- [Express Compression Middleware](https://www.npmjs.com/package/compression)
- [Express Error Handler Middleware](https://www.npmjs.com/package/errorhandler)
- [Naught](https://www.npmjs.com/package/naught)
- [Express Graceful Exit](https://www.npmjs.com/package/express-graceful-exit)
- [Logtastic](https://www.npmjs.com/package/logtastic)

It setup sane defaults for these modules and exposes simple confiuration options for tweaking.  But overall it is an opinionated method for setting up an express service.

## Install

```
$ npm install --save app-server
```

## Basic Usage

```javascript
var Server = require('app-server');

var server = new Server();

// Setup routes
server.app.post('/', function(req, res) {
	res.status(200).json({hello: 'world'})
});

// Start the server
server.start();
```

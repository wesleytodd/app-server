var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	path = require('path'),
	logtastic = require('logtastic'),
	express = require('express'),
	compress = require('compression'),
	errorHandler = require('errorhandler'),
	gracefulExit = require('express-graceful-exit');

var Server = module.exports = function(options) {
	// Setup the defualts
	options = options || {};
	options.port = options.port || Server.defaultOptions.port;
	options.hostname = options.hostname || Server.defaultOptions.hostname;
	options.logDir = options.logDir || Server.defaultOptions.logDir;
	options.logger = options.logger || Server.defaultOptions.logger;
	options.trustProxy = typeof options.trustProxy !== 'undefined' ? options.trustProxy : Server.defaultOptions.trustProxy;
	options.compress = typeof options.compress !== 'undefined' ? options.compress : Server.defaultOptions.compress;
	options.errorHandler = typeof options.errorHandler !== 'undefined' ? options.errorHandler : Server.defaultOptions.errorHandler;
	this.options = options;

	// Where we will keep the server
	this.server = null;

	// Create express server
	this.app = express();
	this.app.set('port', options.port);
	this.app.set('hostname', options.hostname);
	this.app.set('trust proxy', options.trustProxy);
	this.app.set('x-powered-by', false);

	// Setup the logger
	this.logger = options.logger;
	this.logger.outfile = path.join(options.logDir, 'stdout.log');
	this.logger.errfile = path.join(options.logDir, 'stderr.log');
	this.logger.logUncaught();

	// Log errors
	this.app.on('clientError', this.logger.error);

	// Setup middleware
	this.app.use(gracefulExit.middleware(this.app));
	this.app.use(this.logger.middleware());
	if (options.compress) {
		this.app.use(compress());
	}
};
util.inherits(Server, EventEmitter);

Server.defaultOptions = {
	port: 3000,
	hostname: 'localhost',
	logDir: 'log',
	logger: logtastic,
	trustProxy: true,
	compress: true,
	errorHandler: true
};

Server.prototype.start = function() {
	// If we are in dev mode, add errorHandler
	if (this.options.errorHandler && this.app.get('env') !== 'production') {
		this.app.use(errorHandler());
	}

	this.server = this.app.listen(this.options.port, this.options.hostname, function(err) {
		// Currently no error comes through here
		// until this happens: https://github.com/strongloop/express/pull/2623
		if (err) {
			return this.logger.emergency(err);
		}

		// On error, clean up and go offline
		process.on('uncaughtException', this.stop.bind(this));

		// Listen for the shutdown signal
		process.on('message', function(msg) {
			if (msg === 'shutdown') {
				this.gracefulExit();
			}
		}.bind(this));

		// Also listen on sigterm
		process.on('SIGTERM', function() {
			this.stop();
		}.bind(this));

		if (process.send) {
			this.logger.debug('Sending online');
			process.send('online');
		}
		this.logger.notice(util.format('Express server listening on port %d in %s mode', this.options.port, this.app.get('env')));
	}.bind(this));

	// Listen for errors on the server
	// wont be necessary when the error
	// is passed into the listen callback
	this.server.on('error', this.logger.emergency);
};

Server.prototype.stop = function() {
	if (process.send) {
		this.logger.debug('Sending offline');
		process.send('offline');
	}
	this.gracefulExit();
};

Server.prototype.gracefulExit = function() {
	gracefulExit.gracefulExitHandler(this.app, this.server, {
		log: true,
		logger: this.logger.info
	});
};

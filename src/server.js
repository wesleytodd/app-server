var EventEmitter = require('events').EventEmitter;
var logtastic = require('logtastic');
var express = require('express');
var path = require('path');
var consolidate = require('consolidate');
var compress = require('compression');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');
var util = require('util');
var bodyParser = require('body-parser');
var defined = require('defined');

export class AppServer extends EventEmitter {

	constructor (options = {}) {
		super();

		// Setup the default options
		options.port = options.port || 3000;
		options.hostname = options.hostname || null;
		options.logDir = options.logDir || 'log';
		options.logger = options.logger || logtastic;
		options.trustProxy = defined(options.trustProxy, true);
		options.compress = defined(options.compress, true);
		options.errorHandler = defined(options.errorHandler, true);
		options.parseCookies = options.parseCookies || false;
		options.viewDir = options.viewDir || null;
		options.viewEngine = options.viewEngine || null;
		options.viewEngineSuffix = options.viewEngineSuffix || 'html';
		options.gracefulExitSuicide = options.gracefulExitSuicide || 2 * 60 * 1000 + 10 * 1000; // 2m10s (nodejs default is 2m)
		options.cookieSecret = options.cookieSecret || null;
		this.options = options;

		// Where we will keep the server
		this.server = null;

		// Create express server
		this.app = express();
		this.app.set('port', this.options.port);
		this.app.set('hostname', this.options.hostname);
		this.app.set('trust proxy', this.options.trustProxy);
		this.app.set('x-powered-by', false);
		this.app.set('graceful-exit', false);

		// Setup the logger
		this.logger = this.options.logger;
		this.logger.outfile = path.join(this.options.logDir, 'stdout.log');
		this.logger.errfile = path.join(this.options.logDir, 'stderr.log');
		this.logger.logUncaught();

		// Log errors
		this.app.on('clientError', (err) => {
			this.logger.error(err);
			this.emit('error', err);
		});

		// Setup the views
		if (this.options.viewDir && this.options.viewEngine) {
			this.app.engine('html', consolidate[this.options.viewEngine]);
			this.app.set('view engine', this.options.viewEngineSuffix);
			this.app.set('views', this.options.viewDir);
		}

		// Gracefull exit kills keep alives
		this.app.use(this.gracefulExitMiddleware.bind(this));
		this.app.use(this.logger.middleware());

		// Setup optional middleware
		if (this.options.parseBodyUrlEncoded) {
			this.app.use(bodyParser.urlencoded(this.options.parseBodyUrlEncoded));
		}
		if (this.options.parseBodyJson) {
			this.app.use(bodyParser.json(this.options.parseBodyJson));
		}
		if (this.options.parseBodyRaw) {
			this.app.use(bodyParser.raw(this.options.parseBodyRaw));
		}
		if (this.options.parseBodyText) {
			this.app.use(bodyParser.text(this.options.parseBodyText));
		}
		if (this.options.compress) {
			this.app.use(compress());
		}
		if (this.options.parseCookies) {
			this.app.use(cookieParser(this.options.cookieSecret));
		}
	}

	start () {
		// Only allow starting once
		if (this.server) {
			return;
		}

		// If we are in dev mode, add errorHandler
		if (this.options.errorHandler && this.app.get('env') !== 'production') {
			this.app.use(errorHandler());
		}

		this.server = this.app.listen(this.options.port, this.options.hostname, (err) => {
			// Currently no error comes through here
			// until this happens: https://github.com/strongloop/express/pull/2623
			if (err) {
				return this.logger.emergency(err);
			}

			// On error, clean up and go offline
			//process.on('uncaughtException', this.stop.bind(this));

			// Listen for the shutdown signal
			process.on('message', (msg) => {
				if (msg === 'shutdown') {
					this.exit();
				}
			});

			// Also listen on sigterm and sigint
			process.on('SIGTERM', this.stop.bind(this));
			process.on('SIGINT', this.stop.bind(this));

			if (process.send) {
				this.logger.debug('AppServer Sending online');
				process.send('online');
			}
			this.emit('online');
			this.logger.notice(util.format('listening on port %d in %s mode', this.options.port, this.app.get('env')));
		});

		// Listen for errors on the server
		// wont be necessary when the error
		// is passed into the listen callback
		this.server.on('error', (err) => {
			this.logger.emergency(err);
			this.emit('error', err);
		});
	}

	stop () {
		this.emit('stopping');
		if (process.send) {
			this.logger.debug('AppServer sending offline');
			process.send('offline');
		}
		this.exit();
	}

	gracefulExitMiddleware (req, res, next) {
		if (this.app.get('graceful-exit') === true) {
			req.connection.setTimeout(1);
		}
		next();
	}

	exit () {
		if (this.app.get('graceful-exit')) {
			return this.forceExit();
		}

		this.app.set('graceful-exit', true);
		this.logger.debug('AppServer exiting');

		if (this.server) {
			this.emit('exiting');
			process.nextTick(() => {
				this.server.close(() => {
					this.logger.notice('AppServer closed');
					process.exit(0);
				});
			});
		}

		setTimeout(this.forceExit.bind(this), this.options.gracefulExitSuicide);
	}

	forceExit() {
		this.logger.error('AppServer suicide');
		process.exit(1);
	}
}

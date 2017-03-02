'use strict';

/**
 * Custom symbol.
 */
const symbols = {
  poop: '💩'
}

/**
 * Module dependencies.
 */

var mocha = require('mocha');
var request = require('request');
var Base = mocha.reporters.Base;
var inherits = mocha.utils.inherits;
var color = Base.color;

/**
 * Wrap POST request around process.exit.
 */
 
var requestOptions;
process.originalExit = process.exit;
process.exit = function(foo) {
  request(requestOptions, function() {
    process.originalExit(foo);
  });
};

/**
 * Expose `Dot`.
 */

exports = module.exports = FlushReporter;

/**
 * Initialize a new `Flush` matrix test reporter.
 *
 * @api public
 * @param {Runner} runner
 */
function FlushReporter (runner) {
  Base.call(this, runner);

  var self = this;
  var width = Base.window.width * 0.75 | 0;
  var n = -1;
  var progress = '';
  requestOptions = {
    url: process.env.REPORT_URL,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    }
  };

  runner.on('start', function () {
    process.stdout.write('\n');
    progress = '';
  });

  runner.on('pending', function () {
    if (++n % width === 0) {
      process.stdout.write('\n  ');
    }
    progress += Base.symbols.comma;
    process.stdout.write(color('pending', Base.symbols.comma));
  });

  runner.on('pass', function (test) {
    if (++n % width === 0) {
      process.stdout.write('\n  ');
    }
    progress += Base.symbols.dot;
    if (test.speed === 'slow') {
      process.stdout.write(color('bright yellow', Base.symbols.dot));
    } else {
      process.stdout.write(color(test.speed, Base.symbols.dot));
    }
  });

  runner.on('fail', function () {
    if (++n % width === 0) {
      process.stdout.write('\n  ');
    }
    progress += symbols.poop;
    process.stdout.write(color('fail', symbols.poop));
  });

  runner.on('end', function () {
    var payload = {
      data: {
        representation: progress,
        failedTest: runner.failures,
        totalTest: runner.total,
        name: process.env.PWD
      },
      secret: process.env.MICO_SECRET
    };
    requestOptions.body = JSON.stringify(payload);

    console.log();
    self.epilogue();
  });
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(FlushReporter, Base);
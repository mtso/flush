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
var fs = require('fs');
var Base = mocha.reporters.Base;
var inherits = mocha.utils.inherits;
var color = Base.color;

var decycle = require('json-decycle').decycle;

/**
 * Wrap POST request around process.exit.
 */

var isMicoUser = (process.env.REPORT_URL || process.env.MICO_URL) && process.env.MICO_SECRET;
var projectInfo;
var requestOptions;
process.originalExit = process.exit;
process.exit = function(code) {
  if (!isMicoUser) {
    return process.originalExit(code);
  }
  request(requestOptions, function() {
    process.originalExit(code);
  });
};

/**
 * Get org and project properties
 */
try {
  projectInfo = fs.readFileSync(".torus.json", "utf-8");
  projectInfo = JSON.parse(projectInfo);
} catch (err) {}

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
  var failedInfo = [];

  if (isMicoUser) {
    requestOptions = {
      url: process.env.REPORT_URL || process.env.MICO_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      }
    };
  }

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
    // Store error information.
    failedInfo.push(runner.currentRunnable);

    if (++n % width === 0) {
      process.stdout.write('\n  ');
    }
    progress += symbols.poop;
    process.stdout.write(color('fail', symbols.poop + ' '));
  });

  runner.on('end', function () {    

    // Get stack trace
    failedInfo = failedInfo.map(function(info) {
      var title = info.title;
      var body = info.body;
      info = JSON.parse(JSON.stringify(failedInfo, decycle()));
      return {
        title,
        body,
        stack: getStack(info),
      }
    });

    if (isMicoUser) {
      var payload = {
        data: {
          representation: progress,
          failed: runner.failures,
          failed_info: failedInfo,
          total: runner.total,
          name: process.env.MICO_USERNAME,
          org: projectInfo.org,
          project: projectInfo.project
        },
        secret: process.env.MICO_SECRET
      };
      requestOptions.body = JSON.stringify(payload);
    }

    // console.log(failedInfo);
    // console.log(JSON.stringify(failedInfo, decycle(), 2));

    console.log();
    self.epilogue();
  });
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(FlushReporter, Base);

/**
 * Utility
 */

function getStack(obj) {
  var stack = [];
  if (Object.prototype.toString.call(obj) === '[object Object]') {
    var keys = Object.keys(obj);
    keys.forEach(function(key) {
      if (key === 'stack') {
        stack.push(obj[key]);
      } else {
        var trace = getStack(obj[key]);
        stack = stack.concat(trace);
      }
    })
  } else if (Object.prototype.toString.call(obj) === '[object Array]') {
    obj.forEach(function(element) {
      var trace = getStack(element);
      stack = stack.concat(trace);
    });
  }
  return stack;
}
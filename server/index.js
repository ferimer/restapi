/*
 * REST Server
 */

'use strict';

var http = require('http'),
    url = require('url'),
    rdl = require('../parser'),
    log = require('./log'),
    endpointsManager = require('./endpointsManager'),
    endpointManager = require('./endpointManager');

function checkNetworkOptions(options) {
  if (typeof options.port !== 'number') {
    options.port = 3000;
  }
  if (typeof options.hostname !== 'string') { // TODO: Check IP
    options.hostname = '::';
  }
  if (typeof options.hostname6 !== 'string') { // TODO: Check IP
    options.hostname6 = '::';
  }
}

/**
 * definition_file: Path to the REST API DEFINITION FILE
 * options: Extra options to change behaviour
 *  hostname: hostname to listen for connections [DEFAULT: ::]
 *  port: TCP port [DEFAULT: 3000]
 * cb: Callback function
 */
function _RDL_Server(definition_file, options) {
  this.options = typeof options === 'object' ? options : {};

  // Update log system
  options.log && log.override(options.log.info, options.log.debug);
  if (options.debug) {
    log.enable = true;
  }

  checkNetworkOptions(this.options);

  this.api = new rdl(definition_file, {
    baseUrl: ''
  }, start);

  var self = this;
  function start(error) {
    if (error) {
      console.error(error);
    }

    // Preparing server
    var api_info = self.api.getInfo();
    log.info('Loading API "' + api_info.name +
         '" version: ' + api_info.version +
         ' - ' + api_info.description);

    endpointsManager.apiEndpoints = self.api.getEndpoints();

    // Server initialization
    function httpHandler(req, res) {
      res.setHeader('X-Server', 'FerimerRDL HTTP server');

      log.debug('httpHandler Query:', JSON.stringify(req.headers));
      log.debug('httpHandler Method: ' + req.method);
      log.debug('httpHandler URL: ' + req.url);

      // Checking endpoints
      var parsedUrl = url.parse(req.url);
      endpointsManager.locate(parsedUrl.pathname, function (err, endpointInfo) {
        if (err) {
          // If no endpoint found ...
          log.debug('No endpoint found !');
          self.error(res, 404, 'Sorry, Endpoint not found in this Server');
          return;
        }

        log.debug('Endpoint found - found URL parameters -> ', endpointInfo);

        var endpointData = new endpointManager(
          self.api.getEndpoint(endpointInfo.endpoint)
        );
        endpointData.path = endpointInfo.endpoint;
        log.debug("Endpoint Data - ", endpointData.debug);

        // Checking if the method is valid
        if (!(req.method.toLowerCase() in endpointData.data.methods)) {
          self.error(res, 405, 'Method not allowed for this endpoint');
          return;
        }

        endpointData.params.url = endpointInfo.params
        endpointData.params.query = parsedUrl.query;
        endpointData.params.obtainFromBody(req).then(function (data) {
          log.debug("Received params and files: ", data);

          log.debug('Checking input parameters...');
          endpointData.checkParameters(req).then(function () {
            log.debug('Valid parameters...');
            self.process(req, res, endpointData, endpointData.params);
          }, function (error) {
            self.error(res, 412, 'Bad parameters');
          });
        }, function (error) {
          log.debug("Error processing body parameters", error);
          self.error(res, 406, error);
        });
      });
    };

    var server = http.createServer(httpHandler);
    server.listen(self.options.port, self.options.hostname, function() {
      log.info('Listening on ' + self.options.hostname + ':' + self.options.port);
    });
  }
}

_RDL_Server.prototype = {
  error: function(res, code, defaultMsg) {
    code = typeof code === 'number' ? '' + code : code;
    var response = this.api.getResponse(code);
    var errorMsg = (response && JSON.stringify(response.data)) || null;
    if (errorMsg && typeof response.data === 'object' || typeof defaultMsg === 'object') {
      res.writeHead(code, {'Content-Type': 'application/json'});
    } else {
      res.writeHead(code, {'Content-Type': 'text/plain'});
    }
    res.end(errorMsg || (typeof defaultMsg === 'object' ? JSON.stringify(defaultMsg) : defaultMsg));
  },

  process: function(req, res, endpointData, params) {
    if (endpointData.data.cors) {
      for (var header in endpointData.data.cors) {
        res.setHeader(header, endpointData.data.cors[header]);
      }
    }
    // XXX: Workaround issue #15 - Header overwrited
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, PUT, POST, DELETE, HEADER, OPTIONS'
    );

    var self = this;
    function onendpointCallback(error) {
      if (error) {
        log.debug('onendpointCallback error:', error);
        self.error(res, error.code, error.message);
      } else {
        res.end();
      }
    }

    // TODO: Method accepted, check entry params type based on defined schema
    var endpoint_name = endpointData.path.substring(1);
    var callback = req.method.toUpperCase() + ' ' + endpoint_name;
    if (callback in this && typeof this[callback] === 'function') {
      log.debug('Located callback function with method name', callback);
      this[callback](req, res, params, onendpointCallback);
    } else if (endpoint_name in this && typeof this[endpoint_name] === 'function') {
      log.debug('Located callback function without method name', endpoint_name);
      this[endpoint_name](req, res, params, req.method, onendpointCallback);
    } else if ('onendpoint' in this && typeof this['onendpoint'] === 'function') {
      log.debug('Located generic function onendpoint');
      this.onendpoint(req, res, endpointData.data, params, req.method, onendpointCallback);
    } else {
      log.debug('No endpoint callback function found !');
      this.error(res, 501, 'Not implemented');
    }
  }
};

module.exports = _RDL_Server;

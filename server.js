/*
 * REST Server
 */

'use strict';

var http = require('http'),
    path2regex = require('path-to-regexp'),
    rdl = require('./parser'),
    formidable = require('formidable');

///////////////////////////////////////////////////////////////////////////

function info(msg) {
  console.info('REST Server: ' + msg);
}

var debugEnabled = false;
function debug(msg, obj) {
  if (!debugEnabled) {
    return;
  }
  if (obj) {
    msg += ' ' + JSON.stringify(obj);
  }
  info('DEBUG - ' + msg);
}

///////////////////////////////////////////////////////////////////////////

/**
 * definition_file: Path to the REST API DEFINITION FILE
 * options: Extra options to change behaviour
 *  hostname: hostname to listen for connections [DEFAULT: ::]
 *  port: TCP port [DEFAULT: 3000]
 * cb: Callback function
 */
function _RDL_Server(definition_file, options) {
  this.options = typeof options === 'object' ? options : {};

  if (options.debug) {
    debugEnabled = true;
  }
  if (options.log) {
    if (options.log.info && typeof options.log.info === 'function') {
      info = options.log.info;
    }
    if (options.log.debug && typeof options.log.debug === 'function') {
      debug = options.log.debug;
    }
  }
  if (typeof this.options.port !== 'number') {
    this.options.port = 3000;
  }
  if (typeof this.options.hostname !== 'string') { // TODO: Check IP
    this.options.hostname = '::';
  }
  if (typeof this.options.hostname6 !== 'string') { // TODO: Check IP
    this.options.hostname6 = '::';
  }

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
    info('Loading API "' + api_info.name +
         '" version: ' + api_info.version +
         ' - ' + api_info.description);

    var api_paths = [];
    self.api.getEndpoints().forEach(function(endpoint) {
      var keys = [];
      var re = path2regex(endpoint, keys);
      api_paths.push({
        endpoint: endpoint,
        regexp: re,
        keys: keys
      });
    });
    var number_of_endpoints = api_paths.length;

    // Server initialization
    function httpHandler(req, res) {
      res.setHeader('X-Server', 'FerimerRDL HTTP server');

      debug('Query:', JSON.stringify(req.headers));
      debug('Method: ' + req.method);
      debug('URL: ' + req.url);

      // Checking endpoints
      for (var i = 0; i < number_of_endpoints; i++) {
        var endpoint = api_paths[i].regexp.exec(req.url);
        if (endpoint) {
          debug('Endpoint found - ' + api_paths[i].endpoint);
          debug(' -> ', endpoint);
          debug('KEYS:', api_paths[i].keys);
          var endpointData = self.api.getEndpoint(api_paths[i].endpoint);
          endpointData.path = api_paths[i].endpoint;
          debug("Endpoint Data - ", endpointData);

          var params = {};
          for (var j = 1; j < endpoint.length; j++) {
            params[api_paths[i].keys[j-1].name] = endpoint[j];
          }

          // Processing received parameters
          var form = new formidable.IncomingForm();
          form.parse(req, function(err, fields, files) {
            if (err) {
              info('Error getting fields and files - ' + err);
              self.error(res, 406, err);
              return;
            }

            params.fields = fields;
            params.files = files;
            debug("Received params and files: ", params);

            self.checkParameters(req, params, endpointData, function(error) {
              if (error) {
                self.error(res, 412, 'Bad parameters');
                return;
              }
              self.process(req, res, endpointData, params);
            });
          });

          return;
        }
      }

      // If no endpoint found ...
      self.error(res, '404', 'Sorry, Endpoint not found in this Server');
    };

    var server = http.createServer(httpHandler);
    server.listen(self.options.port, self.options.hostname, function() {
      info('Listening on ' + self.options.hostname + ':' + self.options.port);
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

  checkParameters: function(req, params, endpointData, callback) {
    debug('Checking input parameters...');
    var error = false;
    var method = req.method.toLowerCase();
    var allowedParams = endpointData.methods[method].params;
    Object.keys(allowedParams).forEach(function(param) {
      switch (allowedParams[param]) {
        case 'file':
        if (!params.files[param]) {
          error = true;
        }
        break;
        case 'string':
        if (!params.fields[param]) {
          error = true;
        }
        break;
        default:
      }
    });
    callback(error);
  },

  process: function(req, res, endpointData, params) {
    if (endpointData.cors) {
      res.setHeader('Access-Control-Allow-Origin',
        endpointData.cors['Access-Control-Allow-Origin']);
      res.setHeader('Access-Control-Allow-Methods',
        endpointData.cors['Access-Control-Allow-Methods']);
      res.setHeader('Access-Control-Allow-Headers',
        endpointData.cors['Access-Control-Allow-Headers']);
    }

    var self = this;
    function onendpointCallback(error) {
      if (error) {
        debug('onendpointCallback error:', error);
        self.error(res, error.code, error.message);
      } else {
        res.end();
      }
    }

    // Checking if the method is valid
    if (req.method.toLowerCase() in endpointData.methods) {
      // TODO: Method accepted, check entry params type based on defined schema
      var endpoint_name = endpointData.path.substring(1);
      var callback = endpoint_name + '_' + req.method.toLowerCase();
      if (callback in this && typeof this[callback] === 'function') {
        debug('Located callback function with method name', callback);
        this[callback](req, res, params, onendpointCallback);
      } else if (endpoint_name in this && typeof this[endpoint_name] === 'function') {
        debug('Located callback function without method name', endpoint_name);
        this[endpoint_name](req, res, params, req.method, onendpointCallback);
      } else if ('onendpoint' in this && typeof this['onendpoint'] === 'function') {
        debug('Located generic function onendpoint');
        this.onendpoint(req, res, endpointData, params, req.method, onendpointCallback);
      } else {
        debug('No endpoint callback function found !');
        this.error(res, 501, 'Not implemented');
      }
    } else {
      this.error(res, 405, 'Method not allowed for this endpoint');
    }
  }
};

module.exports = _RDL_Server;

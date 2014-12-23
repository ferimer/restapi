/*
 * REST Server
 */

'use strict';

var http = require('http'),
    path2regex = require('path-to-regexp'),
    rdl = require('./parser');

///////////////////////////////////////////////////////////////////////////

function info(msg) {
  console.info('REST Server: ' + msg);
}

function debug(msg, obj) {
  if (obj) {
    msg += ' ' + JSON.stringify(obj);
  }
  info('DEBUG - ' + msg);
}

///////////////////////////////////////////////////////////////////////////

/**
 * definition_file: Path to the REST API DEFINITION FILE
 * options: Extra options to change behaviour
 *  hostname: hostname to listen for connections [DEFAULT: 0.0.0.0]
 *  port: TCP port [DEFAULT: 3000]
 * cb: Callback function
 */
function _RDL_Server(definition_file, options) {
  this.options = typeof options === 'object' ? options : {};
  if (typeof this.options.port !== 'number') {
    this.options.port = 3000;
  }
  if (typeof this.options.hostname !== 'string') { // TODO: Check IP
    this.options.hostname = '0.0.0.0';
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
    var server = http.createServer(function(req, res) {
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
          var params = {};
          for (var j = 1; j < endpoint.length; j++) {
            params[api_paths[i].keys[j-1].name] = endpoint[j];
          }
          self.process(req, res, api_paths[i].endpoint, params);
          res.end();
        }
      }

      // If no endpoint found ...
      self.error(res, '404', 'Sorry, Endpoint not found in this Server');
      res.end();
    });

    server.listen(self.options.port, self.options.hostname, function() {
      info('Listening on ' + self.options.hostname + ':' + self.options.port);
    });
  }
}

_RDL_Server.prototype = {
  error: function(res, code, defaultMsg) {
    code = typeof code === 'number' ? '' + code : code;
    res.writeHead(code, {'Content-Type': 'text/json'});
    var response = this.api.getResponse(code);
    var errorMsg = (response && JSON.stringify(response.data)) || null;
    if (errorMsg && typeof response.data === 'object') {
      res.writeHead(code, {'Content-Type': 'text/json'});
    } else {
      res.writeHead(code, {'Content-Type': 'text/plain'});
    }
    res.write(errorMsg || defaultMsg);
  },

  process: function(req, res, endpoint, params) {
    debug("ENDPOINT", endpoint);
    debug("PARAMS", params);

    // Checking if the method is valid
    if (req.method.toLowerCase() in this.api.getEndpoint(endpoint).methods) {
      // TODO: Method accepted, call callback for backend processing
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(JSON.stringify(this.api.getEndpoint(endpoint)));
    } else {
      this.error(res, 405, 'Method not allowed for this endpoint');
    }
  }
};

module.exports = _RDL_Server;

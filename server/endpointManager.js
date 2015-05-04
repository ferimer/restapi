'use strict';

var Promise = require('promise'),
    endpointParameters = require('./endpointParameters');

function endpointManager(endpointData) {
  var _endpointData = endpointData;
  var _path;
  var _params = new endpointParameters();

  return {
    set path(p) {
      _path = p;
    },

    get path() {
      return _path;
    },

    get params() {
      return _params;
    },

    get data() {
      return _endpointData;
    },

    get debug() {
      return {
        data: _endpointData,
        path: _path
      }
    },

    checkParameters: function(req) {
      return new Promise(function (resolve, reject) {
        var error = false;
        var method = req.method.toLowerCase();
        var allowedParams = _endpointData.methods[method].params;
        if (!allowedParams) {
          // Mandatory params are optional ...
          resolve();
          return;
        }
        Object.keys(allowedParams).forEach(function(param) {
          switch (allowedParams[param]) {
            case 'file':
            if (!_params.files[param]) {
              error = true;
            }
            break;
            case 'string':
            if (!_params.body[param]) {
              error = true;
            }
            break;
            default:
          }
        });

        (error ? reject(error) : resolve());
      });
    }
  }
}

module.exports = endpointManager;

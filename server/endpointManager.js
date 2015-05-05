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
        var mandatoryParameters = _endpointData.methods[method].params;
        if (!mandatoryParameters) {
          // Only need to process if RDF defined mandatory parameters
          resolve();
          return;
        }
        Object.keys(mandatoryParameters).forEach(function(param) {
          switch (mandatoryParameters[param]) {
            case 'file':
            if (!_params.files[param]) {
              error = true;
            }
            break;
            case 'string':
            case 'json':
            if (!_params.get(param)) {
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

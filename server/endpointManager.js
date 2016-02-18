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
          var paramData = null;
          switch (mandatoryParameters[param]) {
            case 'file':
            if (!_params.files[param]) {
              error = true;
            }
            break;

            case 'string':
            paramData = _params.get(param);
            if (paramData === undefined || typeof paramData !== 'string') {
              error = true;
            }
            break;

            case 'json':
            paramData = _params.get(param);
            if (paramData === undefined || typeof paramData !== 'object') {
              error = true;
            }
            break;

            default:
            paramData = _params.get(param);
            if (paramData !== undefined) {
              error = true;
            }
          }
        });

        (error ? reject(error) : resolve());
      });
    }
  }
}

module.exports = endpointManager;

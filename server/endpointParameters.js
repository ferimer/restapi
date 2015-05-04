'use strict';

var formidable = require('formidable'),
    Promise = require('promise');

function endpointParameters() {
  var urlParams = null,
      queryParams = null,
      bodyParams = null,
      fileParams = null,
      otherParams = {};

  return {
    set url(p) {
      urlParams = p;
    },

    get url() {
      return urlParams;
    },

    // Process body parameters (including files)
    obtainFromBody: function(req) {
      return new Promise(function (resolve, reject) {
        var form = new formidable.IncomingForm();

        // Processing received parameters
        form.parse(req, function(err, fields, files) {
          if (err) {
            reject('Error getting fields and files - ' + err);
            return;
          }

          bodyParams = fields;
          fileParams = files;
          resolve({
            fields: fields,
            files: files
          });
        });
      });
    },

    get body() {
      return bodyParams;
    },

    get files() {
      return fileParams;
    },

    add: function(param, value) {
      otherParams[param] = value;
    },

    get: function(paramName) {
     if (bodyParams && bodyParams[paramName]) {
        return bodyParams[paramName];
      } else if (urlParams && urlParams[paramName]) {
        return urlParams[paramName];
      } else if (queryParams && queryParams[paramName]) {
        return queryParams[paramName];
      } else if (fileParams && fileParams[paramName]) {
        return fileParams[paramName];
      } else if (otherParams && otherParams[paramName]) {
        return otherParams[paramName];
      } else {
        return undefined;
      }
    },

    getAll: function() {
      var allParams = {};
      otherParams && Object.keys(otherParams).forEach(function(p) {
        allParams[p] = otherParams[p];
      });
      fileParams && Object.keys(fileParams).forEach(function(p) {
        allParams[p] = fileParams[p];
      });
      urlParams && Object.keys(urlParams).forEach(function(p) {
        allParams[p] = urlParams[p];
      });
      bodyParams && Object.keys(bodyParams).forEach(function(p) {
        allParams[p] = bodyParams[p];
      });

      return allParams;
    }
  }
}

module.exports = endpointParameters;

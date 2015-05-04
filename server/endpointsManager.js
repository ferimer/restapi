'use strict';

var path2regex = require('path-to-regexp');
var api_paths = [],
    number_of_endpoints = 0;

module.exports = {
  set apiEndpoints(e) {
    e.forEach(function(endpoint) {
      var keys = [];
      var re = path2regex(endpoint, keys);
      api_paths.push({
        endpoint: endpoint,
        regexp: re,
        keys: keys
      });
    });

    number_of_endpoints = api_paths.length;
  },

  locate: function(url, cb) {
    for (var i = 0; i < number_of_endpoints; i++) {
      var parsedEndpoint = api_paths[i].regexp.exec(url);
      if (parsedEndpoint) {
        // parsedEndpoint[0] is the target URL
        // parsedEndpoint[x] are the URL parameters

        // Extract (and name it) URL parameters
        var params = {};
        for (var j = 1; j < parsedEndpoint.length; j++) {
          params[api_paths[i].keys[j-1].name] = parsedEndpoint[j];
        }

        cb(null, {
          url: url,
          endpoint: api_paths[i].endpoint,
          params: params
        });
        return;
      }
    }
    cb(true);
  }
}
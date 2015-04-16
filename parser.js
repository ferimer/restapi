/*
 * REST API Definition Parser
 */

'use strict';

var fs = require ('fs');

/**
 * definition_file: Path to the REST API DEFINITION FILE
 * options: Extra options to change behaviour
 *  baseUrl: If set, this URL will be used instead the one into the RDL file
 * cb: Callback function
 */
function _RDL_Parser(definition_file, options, cb) {
  cb = typeof cb === 'function' ? cb : function(){};
  this.options = typeof options === 'object' ? options : {};

  this.definition_file = definition_file;
  this.is_valid = false;

  var self = this;
  this.load(function(err, data) {
    if (err) {
      cb(err);
      return;
    }
    try {
      self.rdl = JSON.parse(data);
      self.validate(cb);
    } catch (e) {
      cb(e);
    }
  });
}

_RDL_Parser.prototype = {
  load: function(cb) {
    fs.readFile(this.definition_file, cb);
  },

  validate: function(cb) {
    // TODO Check if it's a valid RDL file
    this.is_valid = true;
    cb();
  },

  debug: function() {
    console.log(JSON.stringify(this.rdl, true));
  },

  /**
   * Returns information about the API
   */
  getInfo: function() {
    return {
      name: this.rdl.name,
      authors: this.rdl.authors,
      version: this.rdl.version,
      description: this.rdl.description
    };
  },

  /**
   * Returns the base URL
   */
  getBase: function() {
    var base = this.rdl.endpoint.baseUri;
    if (typeof this.options.baseUrl === 'string') {
      base = this.options.baseUrl;
    }
    return base + '/' + this.rdl.endpoint.basePath;
  },

  /**
   * Returns response message
   */
  getResponse: function(code, endpoint) {
    var responses = this.rdl.common.responses;
    if (endpoint) {
      responses = this.getEndpoint(endpoint).responses;
    }
    return responses[code];
  },

  /**
   * Returns an array of endpoints defined in the RDL
   */
  getEndpoints: function() {
    var endpoints = [];

    var self = this;
    Object.keys(this.rdl.resources).forEach(function (version) {
      Object.keys(self.rdl.resources[version]).forEach(function (resource) {
        endpoints.push(self.getBase() + '/' + version + '/' + resource);
      });
    });

    return endpoints;
  },

  /**
   * Return all endpoint info (resource data)
   */
  getEndpoint: function(endpoint) {
    // endpoint format: base + '/' + version + '/' + resource
    try {
      var baseLength = this.getBase().length,
          versionSeparator = endpoint.substring(baseLength + 1).indexOf('/'),
          version = endpoint.substring(baseLength + 1,
                                       baseLength + 1 + versionSeparator),
          resource = this.rdl.resources[version][endpoint.substring(
            baseLength + 1 + versionSeparator + 1
          )],
          responses = this.rdl.common.responses;

      // Adding common responses which are not overwrited
      Object.keys(resource.methods).forEach(function (method) {
        if (!resource.methods[method].responses) {
          resource.methods[method].responses = responses;
        } else {
          Object.keys(responses).forEach(function (response) {
            if (!(response in resource.methods[method].responses)) {
              resource.methods[method].responses[response] = responses[response];
            }
          });
        }
      });

      // Adding CORS support (if enabled)
      if (resource.cors || this.rdl.common.cors) {
        var cors = this.rdl.common.cors || {};
        resource.cors && Object.keys(resource.cors).forEach(function (corskey) {
          cors[corskey] = resource.cors[corskey];
        });
        resource.cors = cors;
      }

      return resource;
    } catch(e) {
      return { error: 'Bad endpoint' };
    }
  }
};

module.exports = _RDL_Parser;

'use strict';

var debugEnabled = false;

function _info(msg) {
  console.info('REST Server: ' + msg);
}

function _debug(msg, obj) {
  if (!debugEnabled) {
    return;
  }
  if (obj) {
    msg += ' ' + JSON.stringify(obj);
  }
  _info('DEBUG - ' + msg);
}

module.exports = {
  set enable(v) {
    debugEnabled = v;
  },

  override: function (infoFunction, debugFunction) {
    if (infoFunction && typeof infoFunction === 'function') {
      _info = infoFunction;
    }
    if (debugFunction && typeof debugFunction === 'function') {
      _debug = debugFunction;
    }
  },

  info: function(msg) {
    _info(msg);
  },

  debug: function (msg, obj) {
    _debug(msg, obj);
  }
}

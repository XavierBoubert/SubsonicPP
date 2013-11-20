(function() {
  'use strict';

  var Subsonic = new (function() {

    var _subsonic = this,
        _tab = false,
        _isEnabled = false,
        _message = {},
        _messageMap = ['state', 'artist', 'title', 'cover'],
        _events = {},
        _disabledTitle = 'Subsonic',
        _DOMPath = 'window.frames[4]';

    // MESSAGE METHODS

    function makeMessageKeyFunction(key) {
      _subsonic[key] = function() {
        if(typeof _message[key] != 'undefined') {
          return _message[key];
        }
        return '';
      };
    };

    for(var i = 0; i < _messageMap.length; i++) {
      makeMessageKeyFunction(_messageMap[i]);      
    }

    // EVENTS

    this.on = function(eventName, eventFunc) {
      _events[eventName] = _events[eventName] || [];
      _events[eventName].push(eventFunc);
    };

    this.fire = function(eventName, args) {
      if(typeof _events[eventName] != 'undefined') {
        for(var i = 0; i < _events[eventName].length; i++) {
          _events[eventName][i](args);
        }
      }
    };

    // GET TAB

    this.tab = function(callback) {
      chrome.windows.getAll({ populate: true }, function(windowList) {
        _tab = false;
        for(var i = 0; i < windowList.length; i++) {
          for(var j = 0; j < windowList[i].tabs.length; j++) {
            var tab = windowList[i].tabs[j];
            if(tab.title.indexOf(_disabledTitle) === 0) {
              _tab = tab;
              callback(tab);
              return;
            }
          }
        }

        callback(false);
      });

      return false;
    };

    // EXECUTE JAVASCRIPT ON TAB

    this.exec = function(script) {
      _subsonic.tab(function() {
        if(_tab) {
          chrome.tabs.update(_tab.id, {url: 'javascript:' + script});
        }
      });
    };

    // IS

    this.isEnabled = function() {
      return _isEnabled;
    };

    this.isPlaying = function() {
      return _subsonic.state() == 'PLAYING';
    };

    // ACTIONS

    this.play = function() {
      _subsonic.exec(
        'if(' + _DOMPath + '.getCurrentSongIndex() == -1) { ' + _DOMPath + '.skip(0); }' +
        'else { ' + _DOMPath + '.player.sendEvent("PLAY", "true"); }'
      );
    };

    this.stop = function() {
      _subsonic.exec(_DOMPath + '.player.sendEvent("PLAY", "false");');
    };

    this.prev = function() {
      _subsonic.exec(_DOMPath + '.onPrevious();');
    };

    this.next = function() {
      _subsonic.exec(_DOMPath + '.onNext(false);');
    };

    // CONTROLLER

    function addControllerToTab() {
      _subsonic.exec(
        'if(typeof window.titleMessage == "undefined") {' +
          'window.titleMessageDefault = "IDLE|||";' +
          'window.titleMessage = window.titleMessageDefault.split("|");' +
          'window.updateTitle = function() {' +
            'window.document.title = "Subsonic [" + window.titleMessage.join("|") + "]";' +
          '};' +
          'window.updateTitle();' +
          'window.playingObserver = function(obj) {' +
            _DOMPath + '.nowPlayingService.getNowPlayingForCurrentPlayer(function(nowPlayingInfo) {' +
              'nowPlayingInfo = nowPlayingInfo || {};' +
              'nowPlayingInfo.artist = nowPlayingInfo.artist || "";' +
              'nowPlayingInfo.title = nowPlayingInfo.title || "";' +
              'nowPlayingInfo.coverArtZoomUrl = nowPlayingInfo.coverArtZoomUrl || "";' +
              'window.titleMessage[0] = obj.newstate;' +
              'window.titleMessage[1] = nowPlayingInfo.artist;' +
              'window.titleMessage[2] = nowPlayingInfo.title;' +
              'window.titleMessage[3] = nowPlayingInfo.coverArtZoomUrl;' +
              'window.updateTitle();' +
            '});' +
          '};' +
          'function addPlayerListener() {' +
            'if(' + _DOMPath + '.player) {' +
              _DOMPath + '.playingObserver = function(obj) {' +
                'window.top.playingObserver(obj);' +
              '};' +
              _DOMPath + '.player.addModelListener("STATE", "playingObserver");' +
            '}' +
            'else {' +
              'setTimeout(addPlayerListener, 1000);' +
            '}' +
          '}' +
          'function playerListenerObserver() {' +
            'if(typeof ' + _DOMPath + '.isSubsonicPP == "undefined" || !' + _DOMPath + '.isSubsonicPP) {' +
              'window.titleMessage = window.titleMessageDefault.split("|");' +
              'window.updateTitle();' +
              _DOMPath + '.isSubsonicPP = true;' +
              'addPlayerListener();' +
            '}' +
            'setTimeout(playerListenerObserver, 1000);' +
          '}' +
          'playerListenerObserver();' +
        '}'
      );
    }

    function constrollerObserver() {
      _subsonic.tab(function() {
        var stopObserve = false;

        if(_tab && _tab.title == _disabledTitle) {
          stopObserve = true;
          setTimeout(function() {
            addControllerToTab();
            setTimeout(constrollerObserver, 1000);
          }, 2000);
        }

        if(!stopObserve) {
          setTimeout(constrollerObserver, 1000);
        }
      });
    }

    this.startController = function() {
      constrollerObserver();
    };

    // MESSAGE

    function messageObserver() {
      _subsonic.tab(function() {
        if(_tab && _tab.title != _disabledTitle) {
          if(!_isEnabled) {
            _subsonic.fire('enabled', true);
          }
          _isEnabled = true;
          var newMessageArray = _tab.title.replace(_disabledTitle, '').replace('[', '').replace(']', '').trim().split('|');
          var newMessage = {};
          for(var i = 0; i < _messageMap.length; i++) {
            var key = _messageMap[i];
            newMessage[key] = newMessageArray[i];
            if(typeof _message[key] == 'undefined' || _message[key] != newMessage[key]) {
              _message[key] = newMessage[key];
              _subsonic.fire(key, _message[key]);
            }
          }
          _message = newMessage;
        }
        else {
          if(_isEnabled) {
            for(var i = 0; i < _messageMap.length; i++) {
              var key = _messageMap[i];
              _message[key] = '';
              _subsonic.fire(key, _message[key]);
            }
            _subsonic.fire('enabled', false);
          }
          _isEnabled = false;
        }

      });

      setTimeout(messageObserver, 1000);
    };

    this.startMessageObserver = function() {
      messageObserver();
    };

  });

  Subsonic.on('enabled', function(isEnabled) {
    chrome.browserAction.setIcon({
      path: 'assets/images/icon-play' + (isEnabled ? '' : '-disabled') + '.png'
    });
  });

  Subsonic.on('state', function(newState) {
    chrome.browserAction.setIcon({
      path: 'assets/images/icon-' + (Subsonic.isPlaying() ? 'stop' : 'play') + '.png'
    });
  });

  chrome.browserAction.onClicked.addListener(function(tab) {
    if(Subsonic.isEnabled()) {
      if(Subsonic.isPlaying()) {
        Subsonic.stop();
      }
      else {
        Subsonic.play();
      }
    }
  });

  Subsonic.startMessageObserver();

})();
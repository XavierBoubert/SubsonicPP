(function() {
  'use strict';

  var Subsonic = new (function() {

    var _subsonic = this,
        _tab = false,
        _isEnabled = false,
        _lastAction = '',
        _lastCover = '',
        _DOMPath = 'window.frames[4]';

    this.tab = function(callback) {
      chrome.windows.getAll({ populate: true }, function(windowList) {
        _tab = false;
        for(var i = 0; i < windowList.length; i++) {
          for (var j = 0; j < windowList[i].tabs.length; j++) {
            var tab = windowList[i].tabs[j];
            if(tab.title.indexOf('Subsonic') === 0) {
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

    this.isTab = function(tabId) {
      return _tab && tab.id == tabId;
    };

    this.isPlaying = function() {
      return _lastAction == 'PLAYING';
    };

    this.exec = function(script) {
      _subsonic.tab(function() {
        if(_tab) {
          console.log(script);
          chrome.tabs.update(_tab.id, {url: 'javascript:' + script});
        }
      });
    };

    this.play = function() {
      _subsonic.exec(
        'if(' + _DOMPath + '.getCurrentSongIndex() == -1) { ' + _DOMPath + '.skip(0); }' +
        'else { ' + _DOMPath + '.player.sendEvent("PLAY", "true"); }'
      );
    };

    this.stop = function() {
      _subsonic.exec(_DOMPath + '.player.sendEvent("PLAY", "false");');
    };

    this.togglePlayStop = function(callback) {
      if(_subsonic.isPlaying()) {
        _subsonic.stop();
      }
      else {
        _subsonic.play();
      }
      if(callback) {
        callback(_subsonic.isPlaying());
      }
    };

    this.prev = function() {
      _subsonic.exec(_DOMPath + '.onPrevious();');
    };

    this.next = function() {
      _subsonic.exec(_DOMPath + '.onNext(false);');
    };

    this.actions = function() {
      if(_tab) {
        return _tab.title.replace('Subsonic', '').replace('[', '').replace(']', '').trim().split(';');
      }
      return [];
    };

    function playingObserver(callback) {
      _subsonic.tab(function() {
        if(_tab) {
          var actions = _subsonic.actions();
          if(actions.length > 0) {
            if(actions[0] != _lastAction) {
              _lastAction = actions[0];
              if(callback) {
                callback(actions[0]);
              }
            }
          }

          setTimeout(function() {
            playingObserver(callback);
          }, 1000);

          return;
        }

        _subsonic.startPlayingObserver(callback);
      });
    }

    this.startPlayingObserver = function(callback) {
      _subsonic.tab(function() {
        if(_tab) {
          setTimeout(function() {
            _subsonic.exec(
              'if(typeof window.titleMessage == "undefined") {' +
                'window.titleMessage = ["IDLE", ""];' +
                'window.updateTitle = function() {' +
                  'window.document.title = "Subsonic [" + window.titleMessage.join(";") + "]";' +
                '};' +
                _DOMPath + '.playingObserver = function(obj) {' +
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
                _DOMPath + '.player.addModelListener("STATE", "playingObserver");' +
              '}'
            );

            playingObserver(callback);
          }, 3000);
        }
        else {
          setTimeout(function() {
            _subsonic.startPlayingObserver(callback);
          }, 1000);
        }
      });
    };

    function coverObserver(callback) {
      _subsonic.tab(function() {
        if(_tab) {
          var actions = _subsonic.actions();
          if(actions.length > 1 && actions != _lastCover) {
            if(callback) {
              callback(actions);
            }
            _lastCover = actions;
          }
        }

        setTimeout(function() {
          coverObserver(callback);
        }, 1000);
      });
    }

    this.startCoverObserver = function(callback) {
      setTimeout(function() {
        coverObserver(callback);
      }, 1000);
    };

    function isEnabledObserver(callback) {
      _subsonic.tab(function() {
        if((_tab && !_isEnabled) || (!_tab && _isEnabled)) {
          _isEnabled = !_isEnabled;
          if(callback) {
            callback(_isEnabled);
          }
        }

        setTimeout(function() {
          isEnabledObserver(callback);
        }, 1000);
      });
    }

    this.startEnabledObserver = function(callback) {
      setTimeout(function() {
        isEnabledObserver(callback);
      }, 1000);
    };

  });

  Subsonic.startPlayingObserver(updatePlayIcon);

  var _isPlaying = false;

  Subsonic.startEnabledObserver(function(isEnabled) {
    chrome.browserAction.setIcon({
      path: 'assets/images/icon-play' + (isEnabled ? '' : '-disabled') + '.png'
    });
  });

  function updatePlayIcon(action) {
    if(_isPlaying != Subsonic.isPlaying()) {
      _isPlaying = !_isPlaying;

      chrome.browserAction.setIcon({
        path: 'assets/images/icon-' + (_isPlaying ? 'stop' : 'play') + '.png'
      });
    }
  }

  chrome.browserAction.onClicked.addListener(function(tab) {
    Subsonic.togglePlayStop(updatePlayIcon);
  });

})();
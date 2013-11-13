(function() {
  'use strict';

  var Subsonic = new (function() {

    var _subsonic = this,
        _tab = false,
        _isPlaying = false,
        _DOMPath = 'window.frames[4]';

    //getCurrentSongIndex()
    //songs.length
    //skip(0) -> start 0

    // nowPlayingService.getNowPlayingForCurrentPlayer(function(info) {
    //console.log(info);
    //});

    this.tab = function(callback) {
      chrome.windows.getAll({ populate: true }, function(windowList) {
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
      return _isPlaying;
    };

    this.exec = function(script) {
      _subsonic.tab(function() {
        if(_tab) {
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

    function playingObserver(callback) {
      _subsonic.tab(function() {
        if(_tab) {
          var action = _tab.title.replace('Subsonic', '').replace('#', '').trim().toUpperCase();
          if(action != '') {
            if(_isPlaying != (action == 'PLAYING')) {
              _isPlaying = !_isPlaying;
              if(callback) {
                callback(_isPlaying);
              }
            }

            setTimeout(function() {
              playingObserver(callback);
            }, 1000);

            return;
          }
        }

        _subsonic.startPlayingObserver(callback);
      });
    }

    this.startPlayingObserver = function(callback) {
      _subsonic.tab(function() {
        if(_tab) {
          setTimeout(function() {
            _subsonic.exec(
              'window.document.title = "Subsonic #IDLE";' +
              _DOMPath + '.playingObserver = function(obj) { window.parent.document.title = "Subsonic #" + obj.newstate; };' +
              _DOMPath + '.player.addModelListener("STATE", "playingObserver");'
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

  });

  chrome.browserAction.onClicked.addListener(function(tab) {
    Subsonic.prev();
  });

})();


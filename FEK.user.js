// ==UserScript==
// @name  FEKv3
// @namespace http://videomatic3.diskstation.me/~worreh/avatar/feklatestrelease/
// @include http://boards.*.leagueoflegends.com/*
// @author  Frosthaven
// @version FEK
// @run-at  document-end
// @require http://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.js
// @updateURL none
// @downloadURL none
// @grant GM_log
// @grant GM_getValue
// @grant GM_setValue
// ==/UserScript==

(function() {

/* CORE ---------------------------------------------------
---------------------------------------------------------*/
var FEK = {
    config: {
      version: '3.0',
      uri: {
        endpoint   : 'http://videomatic3.diskstation.me/~worreh/avatar/feklatestrelease/FEKJSONResponderv2.php',
        codeHome   : 'http://videomatic3.diskstation.me/~worreh/avatar/feklatestrelease/',
        avatarHome : 'http://videomatic3.diskstation.me/~worreh/avatar/'
      }
    },
    session: {
        username : '',
        region   : '',
        platform : 'boards',
        page     : ''    //home, discussion_show, discussion_listing, search, profile, red_tracker, UNKNOWN
    },

    initialize: function(callback) {
      //this should ensure page contents have loaded before returning
        FEK.waitForContent('#page-main', function(){
          FEK.getSessionData();
          FEK.loadMemberData(function() {
            if ($.isFunction(callback)) { callback(); }
          });
        });
    },

    waitForContent: function(selector, callback) {
        //waits for the provided selector to be available before
        //continuing
        var timeOut = 5000, currentTime = 0;
        var interval = setInterval(function() {
            currentTime = currentTime + 1000;

            if (currentTime >= timeOut) {
                //we timed out, shut off the timer
                clearInterval(interval);
            } else {
                //check for #page-main
                if ($(selector).length > 0) {
                    clearInterval(interval);

                    //we can continue initializing
                    if ($.isFunction(callback)) {
                        callback();
                    }
                }
            }
        },1000);
    },

    isValidProfileElement: function(el) {
      if (el.parent().hasClass('left')) {
        //if the element has parent with class left,
        //it's a false positive inline-profile from
        //the comment reply box - "Posting as Frosthaven"
        return false;
      } else {
        return true;
      }
    },

    loadMemberData: function(callback) {
      //loads member data into the session
      //for this, we'll scan for inline-profiles on the page
      //and then make an api call to the FEK server
      var users = [];
      var username;
      $('.inline-profile:not(.fek-prepped)').each(function() {
        if (FEK.isValidProfileElement($(this))) {
          username = $(this).find('.username').html();
          if ($.inArray(username, users) < 0) {
            users.push(username);
          }
          $(this).addClass('fek-prepped');
        }
      });

      $.ajax({
          dataType: "json",
          url: FEK.config.uri.endpoint,
          data: {
              action:     'getMemberData',
              region:     FEK.session.region,
              legacySupport:  true,
              users:      users
          }
      }).success(function(data) {
          FEK.session.users = data.users.records;
          console.log(FEK.session.users);
      }).always(function() {
        if ($.isFunction(callback)) {
            callback();
        }
        $.event.trigger({type: "memberDataLoaded"});
      });
    },

    getSessionData: function() {
        //get username
        var userElement = $('.pvpnet-id-card .link-1');

        if (userElement.attr('href') === 'https://account.leagueoflegends.com/login') {
            //not logged in
            FEK.session.username = false;
        } else {
            //logged in
          FEK.session.username = $('.pvpnet-id-card .link-1').html();
        }

        //get region
        FEK.session.region =  window.location.host.match(/(?:\w+.)?(.+).leagueoflegends.com/)[1];

        //get current page
        if ($('span.site-name').length > 0) {
            if ($('span.discuss').length > 0) {
                FEK.session.page = 'discussion_show';
            } else if ($('.discussion-list-item').length > 0) {
                if ($('#profile-widget').length > 0) {
                  FEK.session.page = 'profile';
                } else if ($('#search-form-large').length > 0) {
                    FEK.session.page = 'search';
                } else {
                  FEK.session.page = 'discussion_listing';
                }
            } else if ($('#red-tracker').length > 0) {
              FEK.session.page = 'red_tracker';
            } else {
                FEK.session.page = 'UNKNOWN';
            }
        } else {
            FEK.session.page = 'home';
        }
    }
};

/* FEATURES -----------------------------------------------
---------------------------------------------------------*/
// todo: expand these into an options
// panel. for now we're just hard coding
// version checking and avatar support

FEK.applyFeature = {
  // VERSION CHECK ---------------------------------
  versionCheck: function() {

  },

  // AVATARS ---------------------------------------
  avatars: function() {
    if (FEK.session.page !== 'discussion_show') { return false; }

    var users = [];
    var replaceImages = function() {

    };

    $('.inline-profile').each(function() {

    });
  }
};

/* IGNITION -----------------------------------------------
---------------------------------------------------------*/
FEK.initialize(function() {
  FEK.applyFeature.avatars();
  console.log('FEK v' + FEK.config.version + ' LOADED!');
});

})();

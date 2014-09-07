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

var FEK = {
    session: {
        username : '',
        region   : '',
        platform : 'boards',
        page     : ''    //home, discussion_show, discussion_listing, search, profile, red_tracker, UNKNOWN
    },

    initialize: function(callback) {
      //this should ensure page contents have loaded before returning
        FEK.waitForContent(function(){
          FEK.getSessionData();
            if ($.isFunction(callback)) { callback(); }
        });
    },

    waitForContent: function(callback) {
        //we need to wait for #page-main to exist before continuing
        var timeOut = 5000, currentTime = 0;
        var interval = setInterval(function() {
            currentTime = currentTime + 1000;

            if (currentTime >= timeOut) {
                //we timed out, shut off the timer
                clearInterval(interval);
            } else {
                //check for #page-main
                if ($('#page-main').length > 0) {
                    clearInterval(interval);

                    //we can continue initializing
                    if ($.isFunction(callback)) {
                        callback();
                    }
                }
            }
        },1000);
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

FEK.initialize(function() {
  console.log(FEK.session);
});

})();

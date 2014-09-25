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

/* PRELOAD ------------------------------------------------
---------------------------------------------------------*/

    var urlsCSS = 'http://videomatic3.diskstation.me/~worreh/avatar/feklatestrelease/css/';
    
    // Prepare css FEK files
    cssFiles = [];
    cssFiles.push(urlsCSS + 'fekv2panel.css?v=2');
    
    // Load css FEK files into the document
    var head = document.getElementsByTagName('head')[0];
    for (var i = 0; i < cssFiles.length; ++i) {
        var cssFile = document.createElement('link');
        cssFile.type = 'text/css';
        cssFile.rel = 'stylesheet';
        cssFile.href = encodeURI(cssFiles[i]);
        head.appendChild(cssFile);
    }

/* CORE ---------------------------------------------------
---------------------------------------------------------*/
var FEK = {
    
    hotkeys : [],
    
    config: {
        version: '3.0',
        
        uri: {
            endpoint   : 'http://videomatic3.diskstation.me/~worreh/avatar/feklatestrelease/FEKJSONResponderv2.php',
            codeHome   : 'http://videomatic3.diskstation.me/~worreh/avatar/feklatestrelease/',
            gfx        : 'http://videomatic3.diskstation.me/~worreh/avatar/feklatestrelease/gfx/',
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
        // This should ensure page contents have loaded before returning
        FEK.waitForContent('#page-main', function() {
            FEK.getSessionData();
            FEK.loadMemberData(function() {
                if ($.isFunction(callback)) { callback(); }
            });
        });
    },
    
    waitForContent: function(selector, callback) {
        // Waits for the provided selector to be available before continuing
        var timeOut = 5000, currentTime = 0;
        var interval = setInterval(function() {
            currentTime = currentTime + 1000;
            
            if (currentTime >= timeOut) {
                // We timed out, shut off the timer
                clearInterval(interval);
            } else {
                // Check for #page-main
                if ($(selector).length > 0) {
                    clearInterval(interval);
                    // We can continue initializing
                    if ($.isFunction(callback)) {
                        callback();
                    }
                }
            }
        }, 1000);
    },
    
    isValidProfileElement: function(el) {
        if (el.parent().hasClass('left')) {
            // If the element has parent with class left, it's a false positive
            // inline-profile from the comment reply box - "Posting as Frosthaven"
            return false;
        } else {
            return true;
        }
    },
    
    loadMemberData: function(callback) {
        // Loads member data into the session for this, we'll scan for
        // inline-profiles on the page and then make an api call to the FEK server
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
              action:        'getMemberData',
              region:        FEK.session.region,
              legacySupport: true,
              users:         users
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
    
    createFeature: function(label, variablename, options, initvalue, tooltip, tabgroup, tab, category, callback) {
        // Registers a feature with the gui to handle variable reading/writing and then runs the callback function
        
        // Get the saved value if it exists, otherwise load the initvalue
        var useInitValue = GM_getValue(variablename,initvalue);
        
        // Check if the provided saved value is in the options group, if not reset it to the default option
        if (options) {
            var validOption = false;
            for (index = 0; index < options.length; ++index) {
                // Split the option and associated value apart
                optionpair = options[index].split('|');
                if (optionpair[0] === useInitValue) {
                    validOption = true;
                }
            }
            
            if (!validOption && useInitValue !== 'off') {
                // The user selected option no longer exists
                useInitValue = initvalue;
            }
        }
        
        // Create the tab for the feature
        FEK.panelCreateTab(tabgroup, tab, function(contentview) {
            // The tab has been created, and we can now create the button within the returned contentview
            var buttonhtml, tooltiphtml, optionpair, initclass, initstyle;
            var scategory = createSafeTag(category);
            // Check if the category exists
            if (contentview.find("#optiongroup[optiongroup='" + scategory + "']").length <= 0) {
                // Create the category
                contentview.append('\
					<div id="optiongroup" optiongroup="' + scategory + '">\
						<h1 class="breakhead">' + category + '</h1>\
					</div>\
                ');
            }
            
            tooltiphtml = '\
				<div id="fektooltip-data">\
					<span id="ttlabel">' + label + '</span><br />\
					<span id="loadtime"></span>\
					<p>' + tooltip + '</p>\
				</div>\
			';
            
            // Create the button toggle for the feature, checking if options is supplied to make it a dropdown
            if (options && typeof options ==="object") {
                // An array of options has been provided, so this is a dropdown
                var optionpair, initlabel, listhtml = '';
                
                // Prepare the list html
                for (index = 0; index < options.length; ++index) {
                    // Split the option and associated value apart
                    optionpair = options[index].split('|');
                    listhtml = listhtml + '<li fekvalue="' + optionpair[0] + '">' + optionpair[1] + '</li>';
                    if (optionpair[0] === useInitValue) {
                        initlabel = optionpair[1];
                    }
                }
                
                // Prepare the button html
                if (useInitValue === "off") {
                    initclass = 'inactive ';
                    initstyle = 'background-position:center; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/button-off.png\');';
                    initlabel = 'Disable';
                } else {
                    initclass = '';
                    initstyle = 'background-position:center; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/button-on.png\');';
                }
                
                buttonhtml = '\
					<div id="button" class="' + initclass + 'dropdown" fekvar="' + variablename + '" style="background-position:right 10px; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/drop-indicator.png\');">\
						' + tooltiphtml + '\
						<div id="indicator" style="' + initstyle + '"></div>\
						<span id="label">' + label + '</span>\
						<span id="choice" fekvalue="' + useInitValue + '">' + initlabel + '</span>\
						<ul>\
							<li fekvalue="off">Disable</li>\
							' + listhtml + '\
						</ul>\
					</div>\
				';
                contentview.find("#optiongroup[optiongroup='" + scategory + "']").append(buttonhtml);
            } else {
                // No options provided, so this is a toggle
                if (useInitValue === 'off') {
                    initclass = 'inactive';
                    initstyle = 'background-position:center; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/button-off.png\');';
                } else {
                    initclass = '';
                    initstyle = 'background-position:center; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/button-on.png\');';
                }
                
                buttonhtml = '\
					<div id="button" class="' + initclass + '" fekvar="' + variablename + '">\
						' + tooltiphtml + '\
						<div id="indicator" style="' + initstyle + '"></div>\
						<span id="label">' + label + '</span>\
					</div>\
                ';
                contentview.find("#optiongroup[optiongroup='" + scategory + "']").append(buttonhtml);
            }
        })
        
        // Run the feature via callback if the feature isn't disabled
        if (useInitValue !== 'off') {
            // Setup the performance timer for the current option
            if (!FEK.timers) { FEK.timers = []; }
            FEK.timers[variablename] = [];
            
            // Create the starting time
            FEK.timers[variablename].start = new Date().getTime();
            
            // Run the callback
            try {
                callback(useInitValue);
            } catch(e) {
                console.log('FEK Feature Error: ' + label + ': ' + e);
            }
            
            // Calculate the processing time
            FEK.timers[variablename].end = new Date().getTime();
            FEK.timers[variablename].time = FEK.timers[variablename].end - FEK.timers[variablename].start;
            if (FEK.timers[variablename].time === 0) { FEK.timers[variablename].time = '< 1'; }
            $("#fekpanel #button[fekvar='" + variablename + "'] #loadtime").html('Overhead: ' + FEK.timers[variablename].time + 'ms');
            // Alert(label + ': ' + time + 'ms');
        }
    },

    panelShow: function() {
        // If doesn't show the panel on the attachments page
        if (FEK.session.page === 'newattachment') { return false; }
        
        if ($('#fekpanel').is(":visible")) {
            // If the panel is already visible when show is called, do nothing
        } else {    
            // Hide all content views to speed up the .show animation
            $('#fekScrollRegion').hide();
            
            // Show the panels off-screen so that we can perform pre-animation calculations
            $( "#fekpanel #col1" ).css('left', '-200vw');
            $( "#fekpanel #col2" ).css('left', '-200vw');
            $('#fekpanel').show(); $("#fekpanel #col2").show();
            
            // Get current panel widths
            var col1width = $("#fekpanel #col1").outerWidth();
            var col2width = $("#fekpanel #col2").outerWidth();
            
            // Set start points
            $( "#fekpanel #col1" ).css('left', '-' + col1width + 'px');
            $( "#fekpanel #col2" ).css('left', '-' + col2width + 'px');
            
            // Animate
            $( "#fekpanel #col1" ).stop().animate({left: "0px"}, 200, function() {
                $("#fekpanel #col2").css('left','-' + (col2width - col1width) + 'px');
                $( "#fekpanel #col2" ).stop().animate({left: col1width + 'px'}, 150, function() {        
                    // Hide all content views to speed up the .show animation
                    $('#fekScrollRegion').show();
                    initScrollbar(".fekScrollRegion");
                });
            });
        }
    },
    
    panelHide: function() {
        // Get current panel widths
        var col1width = $("#fekpanel #col1").outerWidth();
        var col2width = $("#fekpanel #col2").outerWidth();
        
        // Hide all content views to speed up the .show animation
        $('#fekScrollRegion').hide();
        
        // Animate
        $('#fekpanel #button').find('ul').hide();
        $( "#fekpanel #col2" ).stop().animate({left: '-' + (col2width - col1width) + 'px'}, 150, function() {
            $("#fekpanel #col2").hide();
            $( "#fekpanel #col1" ).stop().animate({left: '-' + (col1width) + 'px'}, 200, function() {
                $('#fekpanel').hide();
            });
        });
    },
    
    panelToggle: function() {
        if ($('#fekpanel').is(":visible")) {
            FEK.panelHide();
        } else {
            FEK.panelShow();
        }
    },
    
    panelCreateTab: function(tabgroup, tab, callback) {
        // This will create a tab and content view with the supplied paramaters
        // and send the contentview element back to the calling function
        
        // Prepare special compatible/safe tag names by replacing characters and casing
        var stabgroup = createSafeTag(tabgroup);
        var stab      = createSafeTag(tab);
        
        // Check if the tabgroup exists
        if ($("#fekpanel #col1 #tabgroup[tabgroup='" + stabgroup + "']").length <= 0) {
            // Create the tabgroup
            $('#fekpanel #col1 #tabs').append('\
				<div id="tabgroup" tabgroup="' + stabgroup + '">\
					<h1>' + tabgroup + '</h1>\
				</div>\
            ');
        }
        
        // Check if the tab exists
        if ($("#tab[tab='" + stabgroup + "-" + stab + "']").length <= 0) {
            // Create the tab
            $("#tabgroup[tabgroup='" + stabgroup + "']").append('\
				<div id="tab" tab="' + stabgroup + "-" + stab + '">' + tab + '<div id="indicator"></div></div>\
            ');
        }
        
        // Check if the contentview exists
        if ($("#fekpanel #col2 .fekScrollRegion #contentview[tablink='" + stabgroup + "-" + stab + "']").length <= 0) {
            // Create the contentview
            $("#fekpanel #col2 .fekScrollRegion").append('\
				<div id="contentview" tablink="' + stabgroup + '-' + stab + '">\
				</div>\
			');
        }
        
        // Now that we've setup the tab and contentview panel, lets send the contentview through the callback
        callback($("#contentview[tablink='" + stabgroup + "-" + stab + "']"));
    },
    
    loadWebPanel: function (page, container, callback) {
        container.html('Loading...');
        var webPanel = $.ajax({
            dataType: "json",
            url: FEK.config.uri.endpoint,
            data: {
                action: 'getWebPanel',
                page:	page
            }
        }).success(function(data) {
            container.html(data.html);
            initScrollbar('.fekScrollRegion');
            callback();
        });
    },
    
    registerKey: function(keycode, friendlyname, description, callback) {
        // Registers a keycode to initiate a callback function on keyup
        if ($("#contentview[tablink*='hotkey-list']").length <=0) {
            tabgroup = 'Under The Hood';
            // Add hotkey helper to the panel
            FEK.panelCreateTab(tabgroup, 'Hotkey List', function(contentview) {
                contentview.append('<h1>Hotkeys</h1>');
            });
        }
        
        $("#contentview[tablink*='hotkey-list']").append('\
			<br /><div id="hotkey">' + friendlyname + '</div>' + description + '<br />\
		');
        FEK.hotkeys[keycode] = [];
        FEK.hotkeys[keycode] = callback;
    },
    
    getSessionData: function() {
        // Get username
        var userElement = $('.pvpnet-id-card .link-1');

        if (userElement.attr('href') === 'https://account.leagueoflegends.com/login') {
            // Not logged in
            FEK.session.username = false;
        } else {
            // Logged in
          FEK.session.username = $('.pvpnet-id-card .link-1').html();
        }
        
        // Get region
        FEK.session.region =  window.location.host.match(/(?:\w+.)?(.+).leagueoflegends.com/)[1];
        
        // Get current page
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

/* IGNITION -----------------------------------------------
---------------------------------------------------------*/
FEK.initialize(function() {
  FEK.applyFeature.avatars();
  console.log('FEK v' + FEK.config.version + ' LOADED!');
  
  // Initialize the FEK options panel
  fixNameEncoding();
  createGUI();
  loadSessionData();
  createFeatures();
  settleGUI();
  keyWatch();
});

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

/* UTILITY FUNCTIONS --------------------------------------
---------------------------------------------------------*/

    // FUNCTION: Creates a feature by integrating a toggle into the gui and then running code
    function createFeatures() {
        // FEK.createFeature -> (label, variablename, options, initvalue, tooltip, tabgroup, tab, category, function(optionState) this is a callback
        var tabgroup, tab, category, initvalue, label, options, tooltip;
        
        // NEW CATEGORY!
        tabgroup = 'Core Mods';
        tab      = 'LoL Boards';
        category = 'Category 1';
        
        //-- New Feature -------------------------------------------------------------------------
        //----------------------------------------------------------------------------------------
        tooltip = 'A generic tooltip. This sample has three different options.';
        options = ['1|Option 1',
                   '2|Option 2',
                   '3|Option 3'];
        FEK.createFeature('Dummy Feature 1', 'dummy1', options, '1', tooltip, tabgroup, tab, category,
        function(option) { /* Option stuff in here */ });
        
       //-- New Feature -------------------------------------------------------------------------
       //----------------------------------------------------------------------------------------
       tooltip     =     'You can enable and disable this feature.';
       FEK.createFeature('Dummy Feature 2', 'dummy2', '', 'on', tooltip, tabgroup, tab, category,
       function(option) { /* Option stuff in here */ });
       
        // NEW CATEGORY!
        tabgroup = 'Core Mods';
        tab      = 'LoL Boards';
        category = 'Category 2'; // This is being changed

        //-- New Feature -------------------------------------------------------------------------
        //----------------------------------------------------------------------------------------
        tooltip = 'This sample has two different options.';
        options = ['A|Option A',
                   'B|Option B'];
        FEK.createFeature('Dummy Feature 3', 'dummy3', options, 'A', tooltip, tabgroup, tab, category,
        function(option) { /* Option stuff in here */ });
        
        //-- New Feature -------------------------------------------------------------------------
        //----------------------------------------------------------------------------------------
        tooltip = 'Sample text.';
        FEK.createFeature('Dummy Feature 4', 'dummy4', '', 'off', tooltip, tabgroup, tab, category,
        function(option) { /* Option stuff in here */ });
        
        // NEW CATEGORY!
        tabgroup = 'Under The Hood'; // This is being changed
        tab      = 'FEK Settings';   // This is being changed
        category = 'Panel Settings'; // This is being changed
        
        //-- FEK Hotkeys -------------------------------------------------------------------------
        //----------------------------------------------------------------------------------------
        tooltip = 'This will allow the use of hotkeys to interact with the FEK panel. After enabling, refer to the <b><i>Hotkey List</i></b> tab for a list of supported controls.';
        FEK.createFeature('Use FEK panel hotkeys', 'fekhotkeys','', 'on', tooltip, tabgroup, tab, category,
        function(option) {
            // Register fek hotkeys
            FEK.registerKey('192', '~`', 'Toggles the FEK panel.', function(state, event) {
                if (state === 'keyup' && !$("input").is(":focus") && !$("textarea").is(":focus")) {
                    FEK.panelToggle();
                }
            });
        });
        
        // NEW CATEGORY!
        tabgroup = 'Under The Hood';
        tab      = 'FEK Settings';
        category = 'Other Settings'; // This is being changed
        
        //-- New Feature -------------------------------------------------------------------------
        //----------------------------------------------------------------------------------------
        tooltip = "What is your favorite food?";
        options = ['1|Apple',
                   '2|Banana',
                   '3|Carrot',
                   '4|Doughnut',
                   '5|Egg',
                   '6|Fish'];
        FEK.createFeature('Dummy Feature 5', 'dummy5', options, '3', tooltip, tabgroup, tab, category,
        function(option) { /* Option stuff in here */ });
        
        // NEW CATEGORY!
        tabgroup = 'Misc';
      //tab      = 'FEK Settings';
      //category = 'Other Settings'; // This is being changed
        
        //-- Credits -----------------------------------------------------------------------------
        //----------------------------------------------------------------------------------------
        // Add the changelog to the panel
        FEK.panelCreateTab(tabgroup, 'Credits', function(contentview)
        {
            $("#tab[tab='misc-credits']").click(function() {
                FEK.loadWebPanel('credits', contentview, function() {
                    //load web panel finished
                });
            });
        });
        
        // Any other features that are permanent (such as FEK titles and badges)
        
        //-- FEK Member data ---------------------------------------------------------------------
        //----------------------------------------------------------------------------------------
        $(document).on('memberDataLoaded',function()
        {
            // This is useful but doesn't do anything yet
        });
    }
    
    // FUNCTION: Prevents some clients from loading html into an iframe's body tag
    function docbody() {
        return $('html').first().find('body:not(.wysiwyg)').first();
    }
    
    // FUNCTION: Loads the session data
    function loadSessionData() {
        // Grab version check JSON
        var versionCheck = $.ajax({
            dataType: "json",
            url: FEK.config.uri.endpoint,
            data: {
                action: 'getLatestVersions'
            }
        }).success(function(data) {
            FEK.session.versions = data.versions;
        }).always(function() {
            $.event.trigger({type: "versioncheckDone"});
        });
        
        // Grab twitter JSON
        var getTweets = $.ajax({
            dataType: "json",
            url: FEK.config.uri.endpoint,
            data: {
                action: 'getTweets'
            }
        }).success(function(data) {
            // Alert(JSON.stringify(data.tweets.records));
            FEK.session.tweets = data.tweets;
        }).always(function() {
            $.event.trigger({type: "tweetsLoaded"});
        });
        
        // Grab user data JSON
        if (FEK.session.page === "showthread") {
            // Set up our array for sendData
            var userNameList = [];
            $('.post-col-left').each(function() {
                var name = $(this).find('.post-user').text();
                userNameList.push(name);
            });

            var getMemberData = $.ajax({
                dataType: "json",
                url: FEK.config.uri.endpoint,
                data: {
                    action:        'getMemberData',
                    region:        FEK.session.region,
                    legacySupport: true,
                    users:         userNameList
                }
            }).success(function(data) {
                // Alert(JSON.stringify(data.users.records));
                FEK.session.users = data.users.records;
            }).always(function() {
                $.event.trigger({type: "memberDataLoaded"});
            });
        }        
    }

    // FUNCTION: Fixes encoding of the name
    function fixNameEncoding(name) {
        if (name !== undefined) {
            try {
                var newName = (unescape(decodeURI(escape(name))));
                return newName;
            } catch (err) {
                return name;
            }
        } else {    
            processNames($('.post-user'));
            processNames($('td.author'));
            processNames($('td.last_post'));
            processNames($('.quote-message strong'));
            processNames($('#pvpnet-bar-account-button'));
        }
    }
    
    // FUNCTION: Processes names
    function processNames(target) {
        if(target != 'undefined') {
            for(var i = 0; i < target.length; ++i) {
                try {
                    if(target.eq(i).has('font').length > 0) {
                        var originalText = escape(target.eq(i).find('font').text());
                        target.eq(i).find('font').text(unescape(decodeURI(originalText)));
                    } else {
                        var originalText = escape(target.eq(i).text());
                        target.eq(i).text(unescape(decodeURI(originalText)));
                    }
                } catch (err) {
                    // Do nothing - leave their name as is since it gives an error
                }        
            }
        }
    }
    
    // FUNCTION: Initializes the scroll bar
    function initScrollbar(element) { // Element can be either a jquery selector or an actual element
        var elm;
        var supressx = false;
        var supressy = false;
        
        // Turn the provided element into an object, whether it was a selector or dom object passed
        elm = $(element);
        
        // Check for overflow values
        if (!elm.hasOverflowX()) { supressx = true; }
        if (!elm.hasOverflowY()) { supressy = true; }
        
        // Setup the css
        elm.css('overflow','hidden');
        
        // Check if scrollbar exists already. if it does, update it's values
        if (elm.hasClass("ps-container")) {
            // Update the scrollbar
            elm.perfectScrollbar('destroy');
            elm.perfectScrollbar({wheelSpeed: 30, useKeyboard: true, minScrollbarLength: 35, suppressScrollY: supressy, suppressScrollX: supressx});
        } else {
            // Create the scrollbar
            elm.perfectScrollbar({wheelSpeed: 30, useKeyboard: true, minScrollbarLength: 35, suppressScrollY: supressy, suppressScrollX: supressx});
            
            // Register our element's scrollbars to update on resize
            $(window).resize(function() {
                elm.perfectScrollbar('update'); 
            });
        }
        
        // Destroy the scrollbar if it isn't needed and remove the class we reference
        if (!elm.hasOverflow()) {
            elm.perfectScrollbar('destroy');
            elm.removeClass('ps-container');
        }
    }
    
    // FUNCTION: Creates a safe tag
    function createSafeTag(str) {
        //returns an html-friendly tag name from the provided string
        return str.replace(	/[^a-z0-9\s]/gi, '').replace(/[_\s]/g, '-').toLowerCase();
    }
    
    // FUNCTION: Creates the GUI for the FEK panel
    function createGUI() {
        
        var tooltipshtml = '\
			<div id="fektooltip">\
				tooltip test\
			</div>\
		';
        
        var panelhtml = '\
            <div id="fekpanel">\
                <div id="col1">\
					<div id="logo" style="background:url(' + FEK.config.uri.gfx + 'panelv2/logo.png) no-repeat"></div>\
                    <div id="version">v' + FEK.config.version + '</div>\
                    <div id="tabs">\
                    </div>\
                </div>\
                <div id="col2">\
					<div id="refreshNotice">\
						Changes Saved. Click Here To Refresh The Page.\
					</div>\
					<div id="fekScrollRegion" class="fekScrollRegion">\
                    </div>\
                </div>\
            </div>\
		';
        
        $(docbody()).append(panelhtml);
        $(docbody()).append(tooltipshtml);
        
        //add fek to the main bar
        if (FEK.session.username !== undefined) {
            var fekLinks = '\
				<ul>\
					<li class="">\
						<a style="display:block;" href="javascript:void(0)">My FEK</a>\
						<ul>\
							<li class=""><a style="display:block;" href="#fekaccount">Manage My Account</a></li>\
							<li class=""><a style="display:block;" href="#fekpanel">Toggle Config Panel</a></li>\
						</ul>\
                    </li>\
					<li class="">\
						<a style="display:block;" href="javascript:void(0)">My Forum History</a>\
						<ul>\
							<li class=""><a style="display:block;" href="http://' + FEK.session.region +'.leagueoflegends.com/board/search.php?do=process&searchuser=' + FEK.session.username + '&exactname=1&showposts=1">My Posts</a></li>\
							<li class=""><a style="display:block;" href="http://' + FEK.session.region + '.leagueoflegends.com/board/search.php?do=process&searchuser=' + FEK.session.username + '&exactname=1&starteronly=1&showposts=0">My Threads</a></li>\
						</ul>\
					</li>\
					<li class="">\
						<a style="display:block;" href="javascript:void(0)">Useful Links</a>\
						<ul>\
							<li class=""><a style="display:block;" href="https://twitter.com/FEKStaff" target="_blank">Follow Us On Twitter</a></li>\
						</ul>\
                    </li>\
				</ul>\
			';
        } else {
            var fekLinks = '\
				<ul>\
					<li class="">\
						<a style="display:block;" href="javascript:void(0)">My FEK</a>\
						<ul>\
							<li class=""><a style="display:block;" href="#fekaccount">Manage My Account</a></li>\
							<li class=""><a style="display:block;" href="#fekpanel">Toggle Config Panel</a></li>\
						</ul>\
                    </li>\
					<li class="">\
						<a style="display:block;" href="javascript:void(0)">Useful Links</a>\
						<ul>\
							<li class=""><a style="display:block;" href="https://twitter.com/FEKStaff" target="_blank">Follow Us On Twitter</a></li>\
						</ul>\
                    </li>\
				</ul>\
        	';
        }
        var myFekDropdown = '\
            <li class="" id="FEKLINKS">\
                <a href="#fekpanel" title="">F.E.K.</a>\
                <div class="nav-dropdown-trigger">\
                	<div class="nav-dropdown-container">\
                		<div class="nav-dropdown-magic-bl"></div>\
                		<div class="nav-dropdown-magic-br"></div>\
                		' + fekLinks + '\
                	</div>\
                </div>\
            </li>\
        ';        
        $('#main-navigation').children('.gs-container.gs-table').append(myFekDropdown);
    }
    
    // FUNCTION: Sets the FEK panel to a default tab so that it doesn't look ugly
    function settleGUI() {
        // This sets the GUI panel to the first tab
        $('#fekpanel #tab').each(function() {
            // Remove all contentviews and active tabs
            $(this).removeClass('active');
            $('#fekpanel #col2 #contentview').hide();
        });
        
        // Now set our active tab and contentview to the first tab listed
        $('#fekpanel #tab:first').addClass('active');
        $("#fekpanel #col2 #contentview[tablink='" + $('#fekpanel #tab:first').attr('tab') + "']").show();
    }
    
    // FUNCTION: Watches for keypresses
    function keyWatch() {
        // Clear the active keys when the window is focused or when the text area is refocused
        $(window).focus(function() {
            FEK.activekeys = [];
        })
        
        // Watch for key modifiers being held down
        $( document ).keydown(function( event ) {            
            var i = FEK.activekeys.indexOf(event.which);
            if (i == -1) {
                FEK.activekeys.push(event.which);
            }
            if (FEK.hotkeys[event.which] && typeof FEK.hotkeys[event.which] === 'function') {
                FEK.hotkeys[event.which]('keydown',event);
            }
        });
        
        // Watch for key modifiers being released
        $( document ).keyup(function( event ) {
            if (FEK.hotkeys[event.which] && typeof FEK.hotkeys[event.which] === 'function') {
                FEK.hotkeys[event.which]('keyup',event);
            }
            
            var i = FEK.activekeys.indexOf(event.which);
            if (i != -1) {
                FEK.activekeys.splice(i, 1);
            }
        });
        
        // Setup the fek tooltip
        $(document).on('mousemove', function(e){
            if ($('#fektooltip').css('opacity') > 0) {
                $('#fektooltip').css({
                    left:  e.pageX + 40,
                    top:   e.pageY - 10
                });
            } else {
                $('#fektooltip').css({
                    left:  -10000
                });
            }
        });
        $('#fekpanel #button').mouseenter(function() {
            $('#fektooltip').html($(this).find('#fektooltip-data').html());
            $('#fektooltip').css('opacity',1);
        });      
        $('#fekpanel #button').mouseleave(function() {
            $('#fektooltip').html($(this).find('#fektooltip-data').html());
            $('#fektooltip').css('opacity',0);
        });
        
        // Allow clicking away from the panel to close the panel
        $('body').click(function() {
            FEK.panelHide();
        });
        
        $('#fekpanel').click(function(event) {
            event.stopPropagation();
           	$('#fekpanel #button').find('ul').hide();
        });
        
        // Register click events and activates the feklink tabs
        $('body').on( "click", 'a[href*="#fektab"]', function(event) {
            event.stopPropagation();
            event.preventDefault();
            var tab = $(this).attr('href').replace("#fektab-","");
            $("#tab[tab='" + tab + "']").trigger('click');
            FEK.panelShow();
        });
        
        $("a[href='#fekaccount']").click(function(event) {
            event.stopPropagation();
            event.preventDefault();
            alert('A FEK account is required to setup an avatar. Currently, authorization may be down. Until it is up, please post the avatar you want to use in the official FEK thread for your region. Avatars currently have a 500kb size limit.\n\n-Frosthaven (NA)');
        });
        
        $("a[href='#fekpanel']").click(function(event) {
            event.stopPropagation();
            event.preventDefault();
            FEK.panelToggle();
        });
        
        $('#fekpanel #tab').click(function() {
            
            $('#fekpanel #tab').each(function() {
               // Remove all contentviews and active tabs
               $(this).removeClass('active');
               $('#fekpanel #col2 #contentview').hide();
            });
            
            $(this).addClass('active');
            $('#fekpanel #col2 .fekScrollRegion').scrollTop(0);
            $('#fekpanel #col2 #contentview[tablink=' +$(this).attr('tab') + ']').show();
            initScrollbar('.fekScrollRegion');
        });
        
        $('#fekpanel').on('mousewheel', function(event) {
            event.preventDefault();
        });
        
        $('#fekpanel #button').find('ul').on('mousewheel', function(event) {
            event.stopPropagation();
            event.preventDefault();
        });
        
        $('#fekpanel #button').click(function(event) {
            event.stopPropagation();
            if ($(this).hasClass('dropdown')) {
                if ($(this).find('ul').is(':visible')) {
                    $(this).find('ul').hide();
                } else {
                    $('#fekpanel #button').find('ul').hide();
                    $('#fekpanel #button').css('z-index','9998');
                    $(this).find('ul').show();
                    $(this).css('z-index','9999');
                    $(this).find('ul').scrollTop(0);
                    initScrollbar($(this).find('ul'));
                }
            } else {
                $('#fekpanel #button').find('ul').hide();
                $('#refreshNotice').addClass('visible');
                
                var variablename = $(this).attr('fekvar');
                
                if ($(this).hasClass('inactive')) {
                    // Turn the variable on and save state
                    GM_setValue(variablename,'on');
                    $(this).removeClass('inactive');
                    $(this).find('#indicator').attr('style','background-position:center; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/button-on.png\');');
                } else {
                    // Turn the variable and save state
                    GM_setValue(variablename,'off');
                    $(this).addClass('inactive');
                    $(this).find('#indicator').attr('style','background-position:center; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/button-off.png\');');
                }
            }
        });
        $('#fekpanel #button ul li').click(function(){
            var previousChoice = $(this).closest('#button').find('#choice').text();
            if ($(this).text() !== previousChoice) {
                var variablename = $(this).parent().parent().attr('fekvar');
                GM_setValue(variablename,$(this).attr('fekvalue'));
                $('#refreshNotice').addClass('visible');
            }
            $(this).closest('#button').find('#choice').html($(this).html());
            $(this).closest('#button').find('#choice').attr('fekvalue',$(this).attr('fekvalue'));
            
            if ($(this).attr('fekvalue') === 'off') {
                if ($(this).closest('#button').hasClass('inactive')) { } else {
                    $(this).closest('#button').addClass('inactive');
                    $(this).closest('#button').find('#indicator').attr('style','background-position:center; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/button-off.png\');');
                }
            } else {
                $(this).closest('#button').removeClass('inactive');
                $(this).closest('#button').find('#indicator').attr('style','background-position:center; background-repeat:no-repeat; background-image:url(\'' + FEK.config.uri.gfx + 'panelv2/button-on.png\');');
 
            }
        });
        
        $('#refreshNotice').click(function() {
            location.reload();
        });
    }
    
    // FUNCTION: urlExists
    var urlExists = function(url, callback) {
        if ( ! $.isFunction(callback)) {
            throw Error('Not a valid callback');
        }   
        
        $.ajax({
            type: 'HEAD',
            url: url,
            success: $.proxy(callback, this, true),
            error: $.proxy(callback, this, false)      
        });
    };
    
})();

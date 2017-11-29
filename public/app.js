var CLIENT_ID = '788266948868-71jqaevb00i42tbtmo4fj94804pa1on5.apps.googleusercontent.com';
var API_KEY = 'AIzaSyCm1GUOwQ8clxPoTkWFV03FKqSizLdetLU';
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest", "https://www.googleapis.com/discovery/v1/apis/admin/directory_v1/rest"];
var SCOPES = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/admin.directory.resource.calendar.readonly";
var UPDATE_EVENTS_INTERVAL = 5000;
var PLAY_4K_VIDEOS = false;

var attachBtn = $("#authorize-button");
var disconnectBtn = $("#signout-button");
var newMeetingBtn = $("#new-meeting-button");

var attachResourcePopup = $(".settings");
var timerView = $(".timer");
var scheduleView = $("#schedule");
var videoBackground = $("#video-background");

var updateEventsInterval = null;

var resourceTemplate = Handlebars.compile(document.getElementById("resource-template").innerHTML);
var eventTemplate = Handlebars.compile(document.getElementById("event-template").innerHTML);

attachBtn.click(function() {
  gapi.auth2.getAuthInstance().signIn();
});

disconnectBtn.click(function() {
  gapi.auth2.getAuthInstance().signOut();
  localStorage.removeItem("calendarId");
  if(updateEventsInterval) {
    clearInterval(updateEventsInterval)
  }
});

newMeetingBtn.click(function() {
  window.open("https://hangouts.google.com/call", "_blank");
})

function ViewDisconnected() {
  console.log("ViewDisconnected");
  attachBtn.show();
  disconnectBtn.hide();
  attachResourcePopup.hide();
  timerView.show();
  scheduleView.hide();
}

function ViewAttachResource() {
  console.log("ViewAttachResource"); 

  var calendarId = localStorage.getItem("calendarId");
  if(calendarId) {
    ViewAttached(calendarId);
    return
  }

  updateResources();
  attachBtn.hide();
  disconnectBtn.hide();
  attachResourcePopup.show();
  timerView.hide();
  scheduleView.hide();
}

function ViewAttached(calendarId) {
  console.log("ViewAttached");

  localStorage.setItem("calendarId", calendarId);

  updateEvents(calendarId);

  if(updateEventsInterval) {
    clearInterval(updateEventsInterval)
  }
  updateEventsInterval = setInterval(function(){
      updateEvents(calendarId)
  }, UPDATE_EVENTS_INTERVAL)

  attachBtn.hide()
  disconnectBtn.show();
  attachResourcePopup.hide();
  timerView.show();
  scheduleView.show();
}


function init() {
  initVideoBackground();
  gapi.load('client:auth2', initClient);
}

function initVideoBackground() {
  if(PLAY_4K_VIDEOS) {
    $.getJSON("videos4k.json").success(function(j){
      assets = []
      j.assets.forEach(function(v){
        assets.push(v["url-4K-SDR"])
      })
      startVideoBackground(assets)
    })

  } else {
    $.getJSON("videos.json").success(function(j){
      assets = []
      j.forEach(function(v){
        v.assets.forEach(function(k){
          assets.push(k.url)
        })
      })
      startVideoBackground(assets)
    })
  }
}

function startVideoBackground(urls) {
  var r = urls[Math.floor(Math.random()*urls.length)];
  videoBackground.attr("src", r);

  videoBackground.on("ended", function(e){
    var r = urls[Math.floor(Math.random()*urls.length)];
    videoBackground.attr("src", r);
  })

  videoBackground.on("error", function(e){
    console.log(e.target.error)
    if(e.target.error.code != 4) { // DEMUXER_ERROR_NO_SUPPORTED_STREAMS
      var r = urls[Math.floor(Math.random()*urls.length)];
      videoBackground.attr("src", r);
    }
  })

  // force reset every 30 mins
  setInterval(function(){
    var r = urls[Math.floor(Math.random()*urls.length)];
    videoBackground.attr("src", r);
  }, 1000 * 60 * 30);
}


function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES,
    fetch_basic_profile: false,
    ux_mode: 'popup',
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  });
}

function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    ViewAttachResource()
  } else {
    ViewDisconnected()
  }
}

function updateResources() {
  console.log("updateResources");

  attachResourcePopup.find(".list-group-item").remove();

  // TODO: nextPageToken 
  gapi.client.directory.resources.calendars.list({
    'customer': 'my_customer', 
  }).then(function(response) {
    response.result.items.forEach(function(item){
      attachResourcePopup.children("ul").append(resourceTemplate(item));
    })

    $(".resource").on('click', function(e){
      ViewAttached($(e.target).parent("li").data("calendar"));
    })
  }).catch(function(e){
    alert(e)
  });
}

function updateEvents(calendarId) {
  console.log("updateEvents");

  return gapi.client.calendar.events.list({
    'calendarId': calendarId,
    'timeMin': (new Date()).toISOString(),
    'showDeleted': false,
    'singleEvents': true,
    'maxResults': 7,
    'orderBy': 'startTime'
  }).then(function(response) {
    scheduleView.find(".event").remove();

    response.result.items.forEach(function(item){
      // console.log(item);
      scheduleView.children("ul").append(eventTemplate(item));
    });

    // update time
    var hasActiveEvent = false;
    $("#schedule").find(".time").each(function(i,v){
      var v = $(v)
      var start = moment(v.data("start"), "YYYY-MM-DDTHH:mm:ssZ")
      var end = moment(v.data("end"), "YYYY-MM-DDTHH:mm:ssZ")

      if(start.isValid()){
        if(start.diff(new Date(), "minutes") < 0) {
          v.parent("li").addClass("active")
          hasActiveEvent = true;
          if(end.isValid()){
            v.text("ends " + end.format("hh:mm a"))
          } else {
            v.text("now")
          }
        }
        else if(start.diff(new Date(), "minutes") < 60) {
          // event in less than 60 minutes
          v.text("in " + (start.diff(new Date(), "minutes")*1+1) + " min") 

        } else if (start <= moment().endOf('day')) {       
          // event is today
          v.text(start.format("hh:mm a"))

        } else if(start <= moment().add(1, 'day').endOf('day')) {
          // event is tomorrow
          v.text("tmw, " + start.format("hh:mm a") + "")

        } else {
          // event is in the future, ex: Thu, 30th
          v.text(start.format("ddd, Do"));
        }
      }
    })

    // highlight active event
    if(!hasActiveEvent) { 
      $("#schedule").find(".event").first().addClass("next");
    }

    // make event clickable
    $("#schedule").find(".event").click(function(e){
      var e = $(e.target).parent("li");
      var hangout = e.data("hangout");
      if(hangout) {
        window.open(hangout, '_blank');
      } else {
        alert("Event has no Google Hangout Link!"); 
      }
    });

  }).catch(function(e){
    console.log(e);
  });
}

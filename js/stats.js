function Stats(url) {
	function guid() {
	  function s4() {
	    return Math.floor((1 + Math.random()) * 0x10000)
	      .toString(16)
	      .substring(1);
	  }
	  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
	    s4() + '-' + s4() + s4() + s4();
	}
	function tm(){
		return (new Date()).getTime();
	}
	var uid = guid();
	var connectionFoursquare = new Firebase(url + 'foursquare');
	var connectionDust = new Firebase(url + 'dust');
	var connectionNavigated = new Firebase(url + 'navigated');
	this.onNavigate = function(latlng) {
		latlng.usertoken = uid;
		var desc = null;
		try {
			if (sv.loadedPano) desc = sv.loadedPano.result.location.description;
		} catch (e) {};
		connectionNavigated.push({lat: latlng.lat(), lng: latlng.lng(), desc: desc, tm: tm()});
	};
	this.onCheckins = function(checkin_count) {
		checkin_count.usertoken = uid;
		checkin_count.tm = tm();
		connectionFoursquare.push(checkin_count);
	};
	this.onDustCollected = function(type, data) {
		connectionDust.push({type: type, data: data, tm: tm()});
	};
	this.addDustListener = function(listener) {
		connectionDust.on('child_added', function(snap) {
			listener(snap.val());
		});
	}
	this.addLocationListener = function(listener) {
		connectionNavigated.on('child_added', function(snap) {
			listener(snap.val());
		});
	}
}
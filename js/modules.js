var TrackerModule = function (stats) {
	return {
		init: function () {},
		run: function (sv) {
			stats.onNavigate(sv.latlng);
		},
	}
};

var FlickrModule = function () {
	return {
		config: {
			auth: 'FLICKR_TOKEN_HERE'
		},
		photos: [],
		removePhotos: function (sv) {
			for (var i = 0; i < this.photos.length; i++) {
				sv.scene.remove(this.photos[i]);
			}
			this.photos = [];
		},
		init: function () {
			THREE.ImageUtils.crossOrigin = '';
		},
		run: function (sv) {
			// sv.latlng
			var self = this;
			var lat = sv.latlng.lat(),
				lon = sv.latlng.lng();
			$.getJSON('https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=' + self.config.auth + '&lat=' + lat + '&lon=' + lon + '&radius=0.1&radius_units=miles&extras=url_m,geo,owner_name,views&per_page=40&format=json&jsoncallback=?', function (resp) {
				self.removePhotos(sv);
				var photos = resp.photos.photo;
				for (var i = 0; i < Math.min(photos.length, 40); i++) {
					var img = new THREE.MeshBasicMaterial({
						side: THREE.DoubleSide,
						map: THREE.ImageUtils.loadTexture(photos[i].url_m),
					});
					var plane = new THREE.Mesh(new THREE.CubeGeometry(60, 60, 60), img);
					plane.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
					plane.position.multiplyScalar(Math.random() * 600);
					if (plane.position.distanceTo(sv.origin) < 100) {
						plane.position.addScalar(80 + Math.random() * 80);
					}
					plane.data = photos[i];
					//plane.position.set(Math.floor(i*6)-200, -200, (i%6)*150+400);

					//plane.rotation.y = Math.PI / 2;
					self.photos.push(plane);
					sv.scene.add(plane);
				}
			});
		},
	}
};


var FoursquareModule = function () {
	return {
		config: {
			token: 'FOURSQUARE_TOKEN_HERE',
		},
		init: function () {

		},
		getUrl: function (location) {
			var latlng = [location.lat(), location.lng()].join(',');
			return 'https://api.foursquare.com/v2/venues/search?intent=browse&radius=100&limit=20&ll=' + latlng + '&oauth_token=' + this.config.token + '&v=20160411';
		},
		roundNumUsers: function (num) {
			if (num > 100000)
				return 800;
			if (num > 10000)
				return 500;
			if (num > 5000)
				return 350;
			if (num > 500)
				return 200;
			if (num > 300)
				return 100;
			if (num > 100)
				return 25;
			if (num > 0)
				return num / 3;
			else
				return 0;
		},
		run: function (sv) {
			var self = this;
			$.getJSON(this.getUrl(sv.latlng) + '&callback=?', function (resp) {
				var numCheckins = 'no',
					numUsers = 'zero';
				if (resp && resp.response.venues.length) {
					var numUsers = 0;
					var numCheckins = 0;
					for (var i = 0; i < resp.response.venues.length; i++) {
						numUsers += resp.response.venues[i].stats.usersCount;
						numCheckins += resp.response.venues[i].stats.checkinsCount;
					}
				}
				showMessage('[foursquare] found ' + numCheckins + ' checkins from ' + numUsers + ' people.');
				sv.addShit(self.roundNumUsers(numUsers));
				if (sv.stats) {
					sv.stats.onCheckins({
						lat: sv.latlng.lat(),
						lng: sv.latlng.lng(),
						numUsers: numUsers,
						numCheckins: numCheckins
					});
				}
			});
		}
	}
}

var InstagramModule = function () {
	return {
		config: {
			token: 'INSTGRAM_TOKEN_HERE'
		},
		init: function () {
			THREE.ImageUtils.crossOrigin = '';
		},
		photos: [],
		removePhotos: function (sv) {
			for (var i = 0; i < this.photos.length; i++) {
				sv.scene.remove(this.photos[i]);
			}
			this.photos = [];
		},
		run: function (sv) {
			var self = this;
			var lat = sv.latlng.lat(),
				lon = sv.latlng.lng();
			$.getJSON('https://api.instagram.com/v1/media/search?lat=' + lat + '&lng=' + lon + '&access_token=' + self.config.token + '&callback=?', function (resp) {
				self.removePhotos(sv);
				var photos = resp.data;
				for (var i = 0; i < Math.min(photos.length, 20); i++) {
					var img = new THREE.MeshBasicMaterial({
						map: THREE.ImageUtils.loadTexture(photos[i].images.low_resolution.url),
					});
					var plane = new THREE.Mesh(new THREE.CubeGeometry(60, 60, 60), img);
					plane.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
					plane.position.multiplyScalar(Math.random() * 600);
					if (plane.position.distanceTo(sv.origin) < 100) {
						plane.position.addScalar(80 + Math.random() * 80);
					}
					plane.data = photos[i];
					TweenMax.to(plane.position, 4, {
						y: '-200',
						ease: Bounce.easeOut,
						delay: i * 2,
					});
					self.photos.push(plane);
					sv.scene.add(plane);
				}
			});
		}
	}
}
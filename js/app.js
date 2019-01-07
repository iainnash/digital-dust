// gui helpers
var app;
window.app = app;

function setProgress(progress) {
	$id('bar').style.width = ($id('preloader').clientWidth - 6) * progress / 100 + 'px';
}

function showProgress(show) {
	$id('preloader').style.opacity = (show == true) ? 1 : 0;
	$id('preloader').style.display = (show == true) ? 'block' : 'none';
	if (app.glitchPass) app.glitchPass.goWild = show;
}

function showError(message) {
	$id('error').innerHTML = message;
}

function handleObjectData(data) {
	try {
		if ('caption' in data) {
			showMessage('[instagram] captured dust with ' + data.likes.count + ' likes, captioned `' + data.caption.text + '`');
			if (app.stats) {
				app.stats.onDustCollected('instagram', data);
			}
		}
		if ('views' in data) {
			showMessage('[flickr] captured dust with ' + data.views + ' views from ' + data.ownername);
			if (app.stats) {
				app.stats.onDustCollected('flickr', data);
			}
		}
	} catch (e) {
		console.error(e);
	}
}

function showMessage(message) {
	var msg = $('<div class="msg ok"></div>').text(message);
	msg.appendTo($id('message'));
	setTimeout(function () {
		msg.remove();
	}, 4000);
	msg.delay(2000).slideUp(1000);
	//$id('message').innerHTML = message;
}

var StreetViewAppFactory = function (container) {
	var sv = {
		look: {
			fov: 100,
			lat: 0,
			lon: 0,
			ticks: 0,
		},
		modules: {
			list: {
				init: [],
				load: [],
				loaded: []
			},
			add: function (run, module) {
				module.init(sv);
				sv.modules.list[run].push(module);
			},
			trigger: function (run) {
				for (var i = 0; i < sv.modules.list[run].length; i++) {
					sv.modules.list[run][i].run(sv);
				}
			}
		},
		init: function () {
			// setup page events
			this.events.setup();
			// setup renderer
			this.setup();
		},
		run: function () {
			sv.animate();
		},
		fovUpdated: function () {
			sv.camera.projectionMatrix.makePerspective(sv.look.fov, container.clientWidth / container.clientHeight, sv.camera.near, sv.camera.far);
		},
		events: {
			setup: function () {
				evts = sv.events;
				container.addEventListener('mousedown', evts.mousedown, false);
				container.addEventListener('mousemove', evts.mousemove, false);
				container.addEventListener('mouseup', evts.mouseup, false);
				container.addEventListener('mousewheel', evts.mousewheel, false);
				container.addEventListener('DOMMouseScroll', evts.mousewheel, false);
				container.addEventListener('dblclick', evts.dblclick, false);
				window.addEventListener('resize', evts.windowresized, false);
				$('#showMap').click(function () {
					$('#options').hasClass('expanded') ? sv.hideMap() : sv.showMap();
				});
				document.addEventListener('resize', evts.windowresized, false);
				window.addEventListener('touchend', evts.touchend, false);
			},
			windowresized: function () {
				sv.updateViewSize();
				sv.fovUpdated();
			},
			dblclick: function (evt) {
				try {
					var links = sv.loadedPano.result.links;
					//console.log(links);
					if (links.length > 0) {
						sv.panoSource = 'linkclick';
						var newPano = links[Math.floor(Math.random() * links.length)];
						showProgress(true);
						sv.loader.loadPano(sv.latlng, newPano.pano);
					} else {
						showMessage('couldnt jump :(');
					}
				} catch (e) {
					showMessage('couldnt jump :(');
				}
			},
			mousewheel: function (event) {
				if (event.wheelDeltaY) {
					sv.look.fov -= event.wheelDeltaY * 0.05;
					// Opera / Explorer 9
				} else if (event.wheelDelta) {
					sv.look.fov -= event.wheelDelta * 0.05;
					// Firefox
				} else if (event.detail) {
					sv.look.fov += event.detail * 1.0;
				}
				sv.look.fov = Math.max(Math.min(sv.look.fov, 140), 40);
				sv.fovUpdated();
			},
			mousemove: function (event) {
				var dat = sv.events.mousedowndata;
				dat.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				dat.mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
				if (dat.isUserInteracting) {
					sv.look.lon = (event.clientX - dat.onPointerDownPointerX) * 0.1 + dat.onPointerDownLon;
					sv.look.lat = (event.clientY - dat.onPointerDownPointerY) * 0.1 + dat.onPointerDownLat;
				}
			},
			mousedown: function (event) {
				event.preventDefault();
				var dat = sv.events.mousedowndata;
				/*
				$id('title').style.opacity = 0;
				$id('title').style.pointerEvents = 'none';
				$id('options').style.opacity = 0;
				$id('options').style.pointerEvents = 'none';
				*/
				dat.isUserInteracting = true;
				dat.onPointerDownPointerX = event.clientX;
				dat.onPointerDownPointerY = event.clientY;
				dat.onPointerDownLon = sv.look.lon;
				dat.onPointerDownLat = sv.look.lat;
				dat.hasUpdate = true;
			},
			touchend: function (event) {
				if (event.touches.length == 1) {
					var touch = event.touches[0];
					var dat = sv.events.mousedowndata;
					dat.mouse.x = (touch.pageX / window.innerWidth) * 2 - 1;
					dat.mouse.y = (touch.pageY / window.innerHeight) * 2 - 1;
					dat.hasUpdate = true;
				}
			},
			mouseup: function (event) {
				/*
				$id('title').style.opacity = 1;
				$id('title').style.pointerEvents = 'auto';
				$id('options').style.opacity = 1;
				$id('options').style.pointerEvents = 'auto';
				*/
				sv.events.mousedowndata.isUserInteracting = false;
			},
			mousedowndata: {
				hasUpdate: false,
				isUserInteracting: false,
				onMouseDownMouseX: 0,
				onMouseDownMouseY: 0,
				onMouseDownLon: 0,
				onMouseDownLat: 0,
				mouse: new THREE.Vector2(),
			},
		},
		userActions: {
			init: function () {
				var actions = sv.userActions;
				actions.useMyLocation();
				actions.search();
				actions.fullScreen();
			},
			useMyLocation: function () {
				var el = document.getElementById('myLocationButton');
				if (!el) return;
				el.addEventListener('click', function (event) {
					event.preventDefault();
					navigator.geolocation.getCurrentPosition(
						function (position) {
							debugger
							var currentLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
							map.panTo(currentLocation);
							addMarker(currentLocation);
						},
						function (message) {
							showError(JSON.stringify(message));
						});
				}, false);
			},
			search: function () {
				el = document.getElementById('searchButton');
				el.addEventListener('click', function (event) {
					event.preventDefault();
					sv.findAddress(document.getElementById("address").value);
				}, false);
			},
			fullScreen: function () {
				var el = document.getElementById('fullscreenButton');
				if (el) {
					el.addEventListener('click', function (e) {
						container.onwebkitfullscreenchange = function (e) {
							sv.userActions.lockPointer();
							container.onwebkitfullscreenchange = function () {};
						};
						container.onmozfullscreenchange = function (e) {
							sv.userActions.lockPointer();
							container.onmozfullscreenchange = function () {};
						};
						if (container.webkitRequestFullScreen) container.webkitRequestFullScreen();
						if (container.mozRequestFullScreen) container.mozRequestFullScreen();
						e.preventDefault();
					}, false);
				}
			},
			lockPointer: function () {
				var pointer = navigator.pointer || navigator.webkitPointer;
				if (pointer) {
					pointer.lock(container, function () {
						console.log('Pointer locked');
					}, function () {
						console.log('No pointer lock');
					});
				}
			},

		},
		animate: function () {
			requestAnimationFrame(sv.animate);
			sv.render(sv.clock.getDelta());
		},
		render: function (dt) {
			if (!sv.events.mousedowndata.isUserInteracting) {
				if (sv.torus) sv.torus.rotation.x += .01;
				//lon += .15;
			}

			if (sv.events.mousedowndata.hasUpdate) {
				sv.raycaster.setFromCamera(new THREE.Vector2(
					sv.events.mousedowndata.mouse.x,
					-1 * sv.events.mousedowndata.mouse.y
				), sv.camera);
				var intersects = sv.raycaster.intersectObjects(sv.scene.children);
				for (var i = 0; i < intersects.length; i++) {
					//intersects[i].object.material.color.set(0xff0000);
					if (intersects[i].object.data) {
						handleObjectData(intersects[i].object.data);
					}
					TweenMax.to(intersects[i].object.scale, 1, {
						x: 0,
						y: 0,
						z: 0,
					});
					//sv.scene.remove(intersects[i].object);
					break;
				}
				sv.events.mousedowndata.hasUpdate = false;
			}
			if (window.ismobile) {
				sv.controls.update(dt);
			} else {
				sv.look.lat = Math.max(-85, Math.min(85, sv.look.lat));
				var phi = (90 - sv.look.lat) * Math.PI / 180;
				var theta = sv.look.lon * Math.PI / 180;
				sv.camera.position.x = 100 * Math.sin(phi) * Math.cos(theta);
				sv.camera.position.y = 100 * Math.cos(phi);
				sv.camera.position.z = 100 * Math.sin(phi) * Math.sin(theta);
				sv.camera.lookAt(sv.camera.target);
			}
			if (sv.stereoeffect) {
				sv.stereoeffect.render(sv.scene, sv.camera);
			} else {
				sv.composer.render();
			}
			//sv.renderer.render(sv.scene, sv.camera);
		},
		addMarker: function (location) {
			if (sv.marker) sv.marker.setMap(null);
			sv.hideMap();
			sv.marker = new google.maps.Marker({
				position: location,
				map: sv.map
			});
			sv.marker.setMap(sv.map);
			sv.latlng = location;
			sv.panoSource = 'mapmarker';
			sv.loadPanorama(location);
		},
		setupPanorama: function () {
			sv.loader = new GSVPANO.PanoLoader({
				useWebGL: false,
				zoom: 3
			});
			sv.depthLoader = new GSVPANO.PanoDepthLoader({
				zoom: 3,
			});

			sv.loader.onSizeChange = function () {};
			sv.loader.onProgress = setProgress;
			sv.loader.onError = function (message) {
				showError(message);
				showProgress(false);
			};

			function setupPano() {
				sv.mesh.material.map = new THREE.Texture(sv.loadedPano.canvas[0]);
				sv.mesh.material.map.needsUpdate = true;

				//showMessage( 'Street view data copyright google.' );
				showProgress(false);
			}

			sv.loader.onPanoramaLoad = function () {
				sv.latlng = this.location;

				window.location.hash = sv.latlng.lat() + ',' + sv.latlng.lng();
				//invertCanvas(source);

				// whatever torus
				/*
				var canvas = document.createElement( 'canvas' );
				var s = 2;
				canvas.width = source.width / s;
				canvas.height = source.height / s;
				var ctx = canvas.getContext( '2d' );
				ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, canvas.width, canvas.height );
				sv.uniforms[ 'texture' ].value = new THREE.Texture( source );
				sv.uniforms[ 'texture' ].value.needsUpdate = true;
				sv.uniforms[ 'scaledTexture' ].value = new THREE.Texture( canvas );
				sv.uniforms[ 'scaledTexture' ].value.needsUpdate = true;
				*/
				sv.loadedPano = this;

				if (sv.panoSource === 'mapmarker') {
					sv.depthLoader.load(this.panoId);
				} else {
					setupPano();
				}
				sv.panoSource = null;

				console.log('?');
				showMessage('navigated to ' + this.result.location.description);

			};

			sv.depthLoader.onDepthLoad = function () {
				sv.processDepthMap(this.depthMap, sv.loadedPano.canvas[0])
				sv.modules.trigger('loaded');
				setupPano();
			}
		},
		processDepthMap: function (depthMap, sourceCanvas) {
			var canvasMap = depthMapToCanvas(depthMap);
			var canvasResized = resizeCanvas(canvasMap, sourceCanvas.width, sourceCanvas.height);
			var depthImageData = canvasResized.getContext('2d').getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
			var ctx = sourceCanvas.getContext('2d');
			var imdata = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
			for (var i = 0; i < imdata.data.length; i += 4) {
				//data[i]     = data[i];     // red
				//data[i + 1] = data[i + 1]; // green
				//data[i + 2] = data[i + 2]; // blue
				//imdata.data[i+2]=0;
				// r g b pixels == assume sky IF 

				imdata.data[i + 3] = Math.max(255 - depthImageData.data[i], 120);
				//imdata.data[i+3] = (data[i+2] >= 100 && data[i+1] >= )
			}
			ctx.putImageData(imdata, 0, 0);
			// var canvas = fx.canvas(sourceCanvas).ink(0.25).update();
			//floodfill(10, 0, {r:0,g:0,b:0,a:0}, ctx, sourceCanvas.width, sourceCanvas.height, 130);
		},
		loadPanorama: function (location) {
			sv.latlng = location;
			setProgress(0);
			showProgress(true);
			sv.modules.trigger('load');
			sv.loader.load(location);
		},
		findAddress: function (address) {
			sv.geocoder.geocode({
				'address': address
			}, function (results, status) {
				if (status == google.maps.GeocoderStatus.OK) {
					sv.map.setCenter(results[0].geometry.location);
					showMessage('Address found.');
					if (window.ismobile) {
						sv.addMarker(results[0].geometry.location);
					}
					sv.showMap();
				} else {
					showError("Geocode was not successful for the following reason: " + status);
					showProgress(false);
				}
			});
		},
		hideMap: function () {
			$('#options').removeClass('expanded');
			$('#showMap').html('show map');
		},
		showMap: function (evt) {
			$('#showMap').html('hide map');
			$('#options').addClass('expanded');
		},
		setupGoogle: function () {
			var options = {
				zoom: 13,
				center: sv.latlng,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				streetViewControl: false
			}
			document.getElementById('map').style.height = Math.floor(window.innerHeight * 0.60) + 'px';
			document.getElementById('mapcanvas').style.height = Math.floor(window.innerHeight * 0.60) + 'px';
			sv.map = new google.maps.Map(document.getElementById('mapcanvas'), options);
			var streetViewLayer = new google.maps.StreetViewCoverageLayer();
			streetViewLayer.setMap(sv.map);
			google.maps.event.addListener(sv.map, 'click', function (event) {
				sv.addMarker(event.latLng);
			});
			sv.geocoder = new google.maps.Geocoder();
		},
		randomPos: function () {
			var locations = [{
					lat: 51.50700703827454,
					lng: -0.12791916931155356
				},
				{
					lat: 32.6144404,
					lng: -108.9852017
				},
				{
					lat: 39.36382677360614,
					lng: 8.431220278759724
				},
				{
					lat: 59.30571937680209,
					lng: 4.879402148657164
				},
				{
					lat: 28.240385123352873,
					lng: -16.629988706884774
				},
				{
					lat: 50.09072314148827,
					lng: 14.393133454556278
				},
				{
					lat: 41.413416092316275,
					lng: 2.1531126527786455
				},
				{
					lat: 35.69143938066447,
					lng: 139.695139627539
				},
				{
					lat: 35.67120372775569,
					lng: 139.77167914398797
				},
				{
					lat: 54.552083679428065,
					lng: -3.297380963134742
				}
			];
			var latlng = locations[Math.floor(Math.random() * locations.length)];
			return new google.maps.LatLng(latlng.lat, latlng.lng);
		},
		initalPos: function () {
			sv.panoSource = 'mapmarker';
			if (window.location.hash) {
				parts = window.location.hash.substr(1).split(',');
				return new google.maps.LatLng(parts[0], parts[1]);
			} else {
				return sv.randomPos();
			}
		},
		makeTorus: function () {
			// shader for the cylinder
			var shader = new THREE.ShaderMaterial({
				uniforms: {
					texture: {
						type: 't',
						value: null
					},
					scaledTexture: {
						type: 't',
						value: null
					},
					rAmount: {
						type: 'f',
						value: 0.0
					}
				},
				vertexShader: document.getElementById('vertexShader').textContent,
				fragmentShader: document.getElementById('fragmentShader').textContent
			});
			sv.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
			var material = new THREE.ShaderMaterial({
				fragmentShader: shader.fragmentShader,
				vertexShader: shader.vertexShader,
				uniforms: sv.uniforms
			});
			sv.torus = new THREE.Mesh(new THREE.CylinderGeometry(), material);
			sv.scene.add(sv.torus);
		},
		setupBackground: function () {
			var tex = THREE.ImageUtils.loadTexture('img/gridpat.png');
			tex.wrapT = THREE.RepeatWrapping;
			tex.wrapS = THREE.RepeatWrapping;
			tex.repeat.set(80, 80);
			var shaderMaterial = new THREE.MeshBasicMaterial({
				map: tex,
			});
			var skybox = new THREE.Mesh(new THREE.CubeGeometry(1000, 1000, 1000), shaderMaterial);
			skybox.scale.x = -1;
			sv.scene.add(skybox);
		},
		addShit: function (count) {
			if (sv.stuffobj) {
				sv.scene.remove(sv.stuffobj);
			}
			sv.stuffobj = new THREE.Object3D();
			var geo = new THREE.CubeGeometry(1, 3, 2);
			for (var i = 0; i < count; i++) {
				var mat = new THREE.MeshBasicMaterial({
					color: 0xffffff * Math.random(),
					opacity: 0.3,
					transparent: true,
				});
				var mesh = new THREE.Mesh(geo, mat);
				mesh.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
				mesh.position.multiplyScalar(Math.random() * 500);
				mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
				mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.max(0.2, Math.random() * 4);
				sv.stuffobj.add(mesh);
			}
			sv.scene.add(sv.stuffobj);
		},
		addEffectComposer: function () {
			sv.composer = new THREE.EffectComposer(sv.renderer);
			sv.composer.addPass(new THREE.RenderPass(sv.scene, sv.camera));
			sv.glitchPass = new THREE.GlitchPass(64);
			sv.glitchPass.renderToScreen = true;
			sv.composer.addPass(sv.glitchPass);
		},
		initMobileControls: function () {
			sv.controls = new THREE.OrbitControls(sv.camera, sv.renderer.domElement);
			sv.controls.rotateUp(Math.PI / 4);
			sv.controls.target.set(0, -1, 0);
			sv.controls = new THREE.DeviceOrientationControls(sv.camera, true);
			sv.controls.connect();
			sv.controls.update();
			return sv.controls;
		},
		updateViewSize: function () {
			sv.renderer.setSize(window.innerWidth, window.innerHeight);
			if (sv.stereoeffect) sv.stereoeffect.setSize(window.innerWidth, window.innerHeight);
		},
		setupStereoEffect: function () {
			sv.stereoeffect = new THREE.StereoEffect(sv.renderer);
		},
		setup: function () {
			// get initial position
			sv.latlng = sv.initalPos();

			sv.clock = new THREE.Clock();

			sv.scene = new THREE.Scene();
			//sv.scene.fog = new THREE.Fog(0x000000, 0.3, 1200);

			sv.origin = new THREE.Vector3(0, 0, 0);
			sv.raycaster = new THREE.Raycaster(sv.origin, new THREE.Vector3(0, -1, 0));
			// setup location
			sv.setupGoogle();

			// setup camera
			sv.camera = new THREE.PerspectiveCamera(sv.look.fov, window.innerWidth / window.innerHeight, 1, 1100);
			sv.camera.target = new THREE.Vector3(0, 0, 0);
			sv.scene.add(sv.camera);

			// make geometry mesh
			sv.mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 60, 40), new THREE.MeshBasicMaterial({
				map: THREE.ImageUtils.loadTexture('img/placeholder.jpg'),
				transparent: true
			}));

			sv.mesh.scale.x = -1;
			sv.scene.add(sv.mesh);

			sv.setupBackground();

			// render with webgl
			sv.renderer = new THREE.WebGLRenderer({
				antialias: false
			});

			// desktop retina computer == too many performance penalties
			if (window.ismobile) {
				sv.renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1)
			}

			if (window.location.search.indexOf('vr=y') !== -1 && window.ismobile) {
				sv.setupStereoEffect();

			}
			sv.updateViewSize();
			sv.renderer.shadowMap.enabled = false;

			sv.addEffectComposer();

			// append renderer to the DOM
			container.appendChild(sv.renderer.domElement);

			// create torus element

			sv.events.windowresized();

			sv.userActions.init();
			if (window.ismobile) {
				sv.initMobileControls();
			}

			sv.modules.trigger('init');

			sv.setupPanorama();

			// load panorama
			sv.loadPanorama(sv.latlng);

			if (window.ismobile) {
				$id('options').className += ' mobile';
			}

		}
	};
	return sv;
};

app = StreetViewAppFactory(document.getElementById('container'));
app.stats = new Stats('http://YOUR_FIREBASE_URL.firebaseio.com/');
app.modules.add('load', new FoursquareModule());
app.modules.add('load', new TrackerModule(app.stats));
app.modules.add('loaded', new FlickrModule());
app.modules.add('loaded', new InstagramModule());
app.init();
app.run();

$('#creditsbutton').click(app.showMap);

$('#mnewplace').on('click', function (e) {
	console.log(e);
	e.preventDefault();
	app.addMarker(app.randomPos());
});

$('#msearch').on('click', function (e) {
	e.preventDefault();
	console.log(e);
	var term = prompt('Where do you want to go?');
	$('#address').val(term);
	$('#searchButton').click();
});

if ($(window).width() <= 740 || window.ismobile) {
	$id('mobileblock').style.display = 'inline-block';
	$id('mobileblock').style.opacity = 1;
}
// @license http://opensource.org/licenses/MIT
// copyright Paul Irish 2015


// Date.now() is supported everywhere except IE8. For IE8 we use the Date.now polyfill
//   github.com/Financial-Times/polyfill-service/blob/master/polyfills/Date.now/polyfill.js
// as Safari 6 doesn't have support for NavigationTiming, we use a Date.now() timestamp for relative values

// if you want values similar to what you'd get with real perf.now, place this towards the head of the page
// but in reality, you're just getting the delta between now() calls, so it's not terribly important where it's placed


(function () {

    if ("performance" in window == false) {
        window.performance = {};
    }

    Date.now = (Date.now || function () { // thanks IE8
        return new Date().getTime();
    });

    if ("now" in window.performance == false) {

        var nowOffset = Date.now();

        if (performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart
        }

        window.performance.now = function now() {
            return Date.now() - nowOffset;
        }
    }

})();



function invertCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i]; // red
        data[i + 1] = 255 - data[i + 1]; // green
        data[i + 2] = 255 - data[i + 2]; // blue
    }
    ctx.putImageData(imageData, 0, 0);
}

function depthMapToCanvas(map) {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext('2d');
    var w = map.width;
    var h = map.height;
    canvas.setAttribute('width', w);
    canvas.setAttribute('height', h);
    var image = context.getImageData(0, 0, w, h);
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            var c = map.depthMap[y * w + x] / 50 * 255;
            image.data[4 * (y * w + x)] = c;
            image.data[4 * (y * w + x) + 1] = c;
            image.data[4 * (y * w + x) + 2] = c;
            image.data[4 * (y * w + x) + 3] = 255;
        }
    }
    context.putImageData(image, 0, 0);
    return canvas;
}

function resizeCanvas(canvasIn, toW, toH) {
    var canvasOut = document.createElement('canvas');
    canvasOut.setAttribute('width', toW);
    canvasOut.setAttribute('height', toH);
    canvasOut.getContext('2d').drawImage(canvasIn, 0, 0, toW, toH);
    return canvasOut;
}

$id = function (id) {
    return document.getElementById(id);
}
/* jshint undef:true, browser:true */
/* global game:false */

// Handle asset loading within the game loop (keeps the function simple).
var assetQueue = {
    q: [],
    add: function(task) {
        this.q.push(task);
    },
    load: function() {
        for (var i = 0; i < this.q.length; i++) {
            this.q[i]();
        }
    }
};



// Generate a random path.
//
// Params:
// args {Object} -> Hash of arguments.
//
// args.numv {Number=4} -> A positive integer representing number of vertices.
// Necessary when xrangeMin and xrangeMax or yrangeMin and yrangeMax are used.
//
// args.xrange {Number[]} || args.xrangeMin and args.xrangeMax -> Either pass
// in a static range of numbers that represent the x parts of the verticies
// through which the path traverses, or pass the min and max x range values
// from which random x values are created. If xrangeMin and xrangeMax are
// passed, numv must also be passed or the default used.
//
// args.yrange {Number[]} || args.yrangeMin and args.yrangeMax -> Either pass
// in a static range of numbers that represent the y parts of the verticies
// through which the path traverses, or pass the min and max y range values
// from which random y values are created. If yrangeMin and yrangeMax are
// passed, numv must also be passed or the default used.
//
// args.stepPercent {Number} -> Floating point number of the
//
// Returns:
// an array of points (Objects with .x and .y properties) that represent
// an interpolated path.
//
// Requirements:
// game {Phaser.game} -> A global reference to the currently active instance.
var randomPath = function(args) {
    args = args || {};

    // References to external methods and properties.
    var width = game.width;
    var height = game.height;
    // Phaser likes to use this a lot.
    var randInt = game.rnd.between.bind(game.rnd);
    var linearInterpolation = game.math.linearInterpolation.bind(game.math);

    // vertices (assume 0 is just silly, so treat as falsey.).
    var numv = args.numv ||
        (args.xrange && args.yrange && Math.min(args.xrange.length, args.yrange.length)) ||
        (args.xrange && args.xrange.length) ||
        (args.yrange && args.yrange.length);
    // 1 dimensional
    var genNumbers = function(rangeMin, rangeMax) {
        var vs = [];
        for (var i = 0; i < numv; i++) {
            vs[i] = randInt(rangeMin, rangeMax);
        }
        return vs;
    };
    // Set of two dimensional points from which to generate the path.
    var vsx = args.xrange || genNumbers(args.xrangeMin || 0, args.xrangeMax || width);
    var vsy = args.yrange || genNumbers(args.yrangeMin || 0, args.yrangeMax || height);
    // Will be the resulting, interpolated path.
    var vs = [];
    // Rate of change.
    var delta = args.stepPercent || 1 / Math.max(width, height);
    for (var i = 0; i <= 1; i += delta) {
        vs.push({
            x: linearInterpolation(vsx, i),
            y: linearInterpolation(vsy, i),
        });
    }

    return vs;
};

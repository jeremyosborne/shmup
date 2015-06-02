/* jshint unused:true, undef:true, node:true */

// gulp specific stuff below ////////////////////////////////
//
// http://gulpjs.com/
var gulp = require("gulp");
// For dev server.
var connect = require("gulp-connect");
var concat = require("gulp-concat");



var paths = {
    js: [
        "js/phaser.js",
        // This needs be first.
        "js/game.js",
        "js/utils.js",
        "js/components.js",
        "js/entities.js",
        "js/stages.js",
        // This needs be last.
        "js/main.js",
    ]
};



gulp.task("js-dev", function() {
    return gulp.src(paths.js)
        .pipe(concat("app.js"))
        .pipe(gulp.dest("./"));
});



gulp.task("default", ["js-dev"], function() {
    connect.server({
        port: "4242",
    });

    gulp.watch(paths.js, ['js-dev']);
});

/* jshint undef:true, browser:true */
/* global Phaser:false */

// Global game object.
var game = new Phaser.Game(
    // String dimensions are considered percentages of parent container.
    "100", "100",
    // Let Phaser choose the renderer.
    Phaser.AUTO,
    // What element do we want to use as the parent.
    document.querySelector(".game-container")
);

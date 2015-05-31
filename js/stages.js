/* jshint unused:true, undef:true, browser:true */
/* global Phaser:false, game:false, assetQueue:false, PurpleDino:false,
LevelDisplay:false, ScoreKeeper:false, Pig:false, ConfettiEmitter:false */



// Opening screen of the game.
var Title = function() {};
Title.prototype = Object.create(Phaser.State);
Title.prototype.preload = function() {
    // Load all queued up assets.
    assetQueue.load();

    // Test out scaling.
    // This works a bit funky.
    // game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    // game.scale.minWidth = 640;
    // game.scale.minHeight = 480;
    // game.scale.maxWidth = 1280;
    // game.scale.maxHeight = 960;
    // game.scale.forceLandscape = true;
    // game.scale.pageAlignHorizontally = true;
    // game.scale.setScreenSize(true);
};
Title.prototype.create = function() {

    // I think, according to forum posts, this turns off anti-aliasing.
    //game.stage.smoothed = false;

    // The background isn't meant to be tiled, but good enough for this.
    //this.background = this.game.add.tileSprite(0, 0, this.game.width, this.game.height, 'bg-space');

    this.titleText = this.game.add.text(this.game.world.centerX, this.game.world.centerY,
        "shmup", {
        fill: "#ffffff",
		font: "bold 42px Arial",
        align: "center",
	});
    this.titleText.anchor.set(0.5);

    // Every game needs an (inane) story.
    // Scroll from right to left.
    // this.marqueeText = this.game.add.text(this.game.world.width + 20, this.game.world.height - 48,
    //     [
    //         "TBA....",
    //     ].join(" "), {
    //     fill: "#ffffff",
	// 	font: "bold 28px Arial",
	// });

    this.game.input.onDown.add(function() {
        // This event listener gets purged when we transition to "play" state.
        this.game.state.start("play");
    }.bind(this));
};
Title.prototype.update = function() {
    //this.marqueeText.x -= 3;

    //this.background.tilePosition.y += 0.5;
};
game.state.add("title", Title);



// Play state.
var Play = function() {};
Play.prototype = Object.create(Phaser.State);
// What is our current level?
// Start at zero, it will be incremented correctly to the first level.
Play.prototype.level = 0;
// What score increments do we increase the level?
Play.prototype.levelScoreIncrement = 6;
// Handle the exploding purple dino.
// There's only one purple dino.
// Causes a transition to the end state if we've run out of lives.
Play.prototype.explodePurpleDino = function(purpleDino) {
    this.purpleDinoSplosion.boom(purpleDino.x, purpleDino.y);
    //this.game.sound.play("explosion-dino", true);
    purpleDino.toStartLocation();

    this.scoreKeeper.decreaseLives();
};
Play.prototype.explodePig = function(pig) {
    // Remove only living pigs.
    if (pig && pig.alive && pig.exists) {
        this.pigSplosion.boom(pig.x, pig.y);
        //this.game.sound.play("explosion-pig", true);
        pig.kill();

        // And get a point.
        this.scoreKeeper.add(1);
    }
};
Play.prototype.addPig = function() {
    // Bring in the replacement pig.
    var nextPig = this.pigs.getFirstDead();
    if (nextPig) {
        nextPig.start();
    }
};
Play.prototype.create = function() {
    var i;

    // To make the sprite move we need to enable Arcade Physics
    game.physics.startSystem(Phaser.Physics.ARCADE);

    var confetti = game.add.bitmapData(5, 5, "bullet", true);
    // r, g, b, a
    confetti.fill(100, 255, 100, 1);

    // The background isn't meant to be tiled, but good enough for this.
    //this.background = g.add.tileSprite(0, 0, g.width, g.height, 'bg-space');

    this.scoreKeeper = new ScoreKeeper(32, 32);

    // Start background music.
    //g.sound.stopAll();
    // TODO: Get new background music.
    //g.sound.play("bg-music", 0.25, true);

    this.levelDisplay = new LevelDisplay();

    this.purpleDino = new PurpleDino(this.game.world.centerX, this.game.world.centerY);

    this.purpleDinoSplosion = new ConfettiEmitter();
    this.purpleDinoSplosion.colorize(0x942fcd);

    this.bullets = game.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.bullets.createMultiple(30, this.game.cache.getBitmapData("bullet"));
    this.bullets.setAll('anchor.x', 0.5);
    this.bullets.setAll('anchor.y', 0.5);
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);

    this.bulletTimer = this.game.time.create();
    this.bulletTimer.loop(150, function() {
        var bullet = this.bullets.getFirstExists(false);
        if (bullet) {
           bullet.reset(this.purpleDino.x + 20, this.purpleDino.y);
           bullet.alive = true;
           bullet.body.velocity.x = 300;
       }
    }.bind(this));
    this.bulletTimer.start();

    this.pigs = this.game.add.group();
    for (i = 0; i < 10; i++) {
        this.pigs.add(new Pig());
    }
    Pig.targetForAll(this.purpleDino);

    this.pigSplosion = new ConfettiEmitter();
    // Random colors by default.
    this.pigSplosion.colorize();

    // First pig can be placed 1/2 second from now.
    this.pigSpawnDelay = this.game.time.now + 500;
};
Play.prototype.update = function() {
    // Before anything else, is the game still going?
    if (this.scoreKeeper.lives <= 0) {
        this.scoreKeeper.save();
        game.state.start("end");
    }

    var currentLevel = Math.floor(this.scoreKeeper.score / this.levelScoreIncrement) + 1;
    if (!this.level) {
        // First display
        this.level = 1;
        this.levelDisplay.display(this.level);
    } else if (currentLevel > this.level) {
        this.level = currentLevel;
        this.levelDisplay.display(this.level);
    }

    // var backgroundScroll = Phaser.Point.normalize(this.purpleDino.body.velocity);
    // this.background.tilePosition.x += backgroundScroll.x / 3;
    // this.background.tilePosition.y += backgroundScroll.y / 3;

    // Flaktulence blows up pigs.
    game.physics.arcade.overlap(this.pigs, this.bullets, this.explodePig.bind(this));

    // Pigs blow up dino.
    game.physics.arcade.overlap(this.purpleDino, this.pigs, function(purpleDino, pig) {
        this.explodePig(pig);

        this.explodePurpleDino(purpleDino);
    }.bind(this));

    // Note: This check caused some bizarre condition when placed before the
    // collision/overlap.
    if (this.pigSpawnDelay < this.game.time.now && Math.min(this.pigs.countLiving(), 10) < this.level) {
        this.addPig();
        // Each additional pig is added 750ms in the future.
        this.pigSpawnDelay = this.game.time.now + 800;
    }

};
Play.prototype.render = function() {
    // Info about input params are positioning offset.
	//this.game.debug.inputInfo(32, 32);
    //this.game.debug.pointer();
    //-----
    // Info about sprites.
    // this.game.debug.bodyInfo(this.purpleDino, 32, this.game.world.height - 100);
    // this.game.debug.body(this.purpleDino);
    // var p = this.pigs.getFirstExists();
    // if (p) {
    //    this.game.debug.body(p);
    // }
    // var b = this.bullets.getFirstExists();
    // if (b) {
    //    this.game.debug.body(b);
    // }
    // Other debug helpers.
    //-----
    // Num entities registered in the game.
    //console.log(game.world.children.length);
};
game.state.add("play", Play);



// The final screen, allowing us a chance to stop the game for a bit and
// then restart the game.
var End = function() {};
End.prototype = Object.create(Phaser.State);
End.prototype.create = function() {
    // The background isn't meant to be tiled, but good enough for this.
    //this.background = this.game.add.tileSprite(0, 0, this.game.width, this.game.height, 'bg-space');

    var text = "The End.\nClick to play again";
    if (ScoreKeeper.savedScoreIsHigh()) {
        text = "You got the high score!\n" + text;
    }
    this.titleText = this.game.add.text(this.game.world.centerX, this.game.world.centerY,
        text, {
        fill: "#ffffff",
		font: "bold 42px Arial",
        align: "center",
	});
    this.titleText.anchor.set(0.5);

    this.game.input.onDown.add(function() {
        this.game.state.start("play", true);
    }.bind(this));
};
End.prototype.update = function() {
    //this.background.tilePosition.y += 0.5;
};
game.state.add("end", End);

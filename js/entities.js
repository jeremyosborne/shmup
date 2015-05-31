/* jshint unused:true, undef:true, browser:true */
/* global Phaser:false, game:false, assetQueue:false, componentize:false, locomotionRandomWalkComponent:false, locomotionSeekerComponent:false */

assetQueue.add(function() {
    // width, height, name, true means add to cache (later retrieval by name).
    game.add.bitmapData(10, 10, "confetti", true).fill(255, 255, 255, 1);
});
// Used for exploding dinos and exploding pigs.
// Extenders Phaser.Emitter.
var ConfettiEmitter = function() {
    // game, initialX, initialY, maxParticles
    Phaser.Particles.Arcade.Emitter.call(this, this.game, 0, 0, 100);
    this.makeParticles(this.game.cache.getBitmapData("confetti"));
    this.gravity = 200;
};
ConfettiEmitter.prototype = Object.create(Phaser.Particles.Arcade.Emitter.prototype);
ConfettiEmitter.prototype.game = game;
// Explode paricles at a point.
// {Number} x, {Number} y -> Point in world to emit particles.
ConfettiEmitter.prototype.boom = function(x, y) {
    // Position emitter to distribute particles.
    this.x = x;
    this.y = y;
    // The first parameter sets the effect to "explode" which means all particles are emitted at once
    // The second gives each particle a 2000ms lifespan
    // The third is ignored when using burst/explode mode
    // The final parameter (10) is how many particles will be emitted in this single burst
    this.start(true, 2000, null, 10);
};
// {Color} -> A phaser supported color expression. Turns all phaser particles
// this color, otherwise randomizes the color for each particle emitted.
ConfettiEmitter.prototype.colorize = function(color) {
    this.forEach(function(p) {
        // Give each piece of confetti a random tint.
        p.tint = color || Phaser.Color.getRandomColor();
    });
};



assetQueue.add(function() {
    game.load.image('pig', 'assets/sprites/pig.png');
});
// The main antagonists. They chase the purple dino.
var Pig = function(x, y) {
    Phaser.Sprite.call(this, this.game, x || 0, y || 0, 'pig');
    this.anchor.setTo(0.5, 0.5);
    // TODO: For some reason, flipping the scale negative prevents collisions
    // of the pig. File bug for this. For now, pigs are upside down.
    //
    // Flip right facing pig sprite around y axis.
    //this.scale.y = -1;
    this.game.physics.arcade.enable(this);
    // Make collisions a bit more forgiving.
    this.body.setSize(this.width - 8, this.height - 8);

    this.game.add.existing(this);

    // Managed by the group, starts off dead.
    this.kill();

    // Components need to be init'd per instance.
    this.componentsInit();
    // Then add the components we want.
    if (Phaser.Math.chanceRoll(50)) {
        this.componentsAdd(locomotionRandomWalkComponent());
    } else {
        this.componentsAdd(locomotionSeekerComponent());
    }
};
Pig.prototype = Object.create(Phaser.Sprite.prototype);
// Add components to the mix.
componentize(Pig);
Pig.prototype.game = game;
Pig.prototype.start = function() {
    this.reset(0, 0);
    this.revive();
    this.componentsReset();
};
Pig.prototype.update = function() {
    if (!this.alive) {
        // Skip the update. kill()ed phaser objects still call update in
        // the background. destroy()ed phaser objects don't.
        return;
    }

    this.componentsUpdate();
};
// What are these pigs chasing?
Pig.prototype.target = null;
// Sets the target for all the pigs.
Pig.targetForAll = function(target) {
    this.prototype.target = target;
};



assetQueue.add(function() {
    game.load.image('purple-dino', 'assets/sprites/purple-dino.png');
});
// Our protagonist. Follows the pointer around, let's out gas, tries to
// blow up pigs for big points and big prizes.
var PurpleDino = function(x, y) {
    // Where we are reset when we die.
    this.startX = x || 0;
    this.startY = y || 0;

    Phaser.Sprite.call(this, this.game, this.startX, this.startY, "purple-dino");
    this.anchor.setTo(0.5, 0.5);
    // For collisions.
    this.game.physics.arcade.enable(this);
    // Shrink the body size to make collisions a bit more forgiving.
    this.body.setSize(this.width - 6, this.height - 6);
    this.game.add.existing(this);
};
PurpleDino.prototype = Object.create(Phaser.Sprite.prototype);
PurpleDino.prototype.game = game;
// The dino isn't directly .kill()ed in the game, only moved around.
// This acts to teleport the dino back to the start when the dino dies.
PurpleDino.prototype.toStartLocation = function() {
    this.x = this.startX;
    this.y = this.startY;
};
PurpleDino.prototype.update = function() {
    var g = this.game;
    if (g.physics.arcade.distanceToPointer(this, g.input.activePointer) > 8) {
        // Dino wants to follow the mouse or finger.
        g.physics.arcade.moveToPointer(this, 300);
    } else {
        // Still face the dino to the pointer.
        this.body.velocity.set(0);
    }
};



// Keeps score, tracks lives, and handles what level we're on.
var ScoreKeeper = function(x, y) {
    Phaser.Text.call(this, this.game, x, y, "", {
        fill: "#ffffff",
		font: "bold 16px Arial",
	});

    this.game.add.existing(this);

    if (localStorage.highScore) {
        this.highScore = localStorage.highScore;
    }
};
ScoreKeeper.prototype = Object.create(Phaser.Text.prototype);
ScoreKeeper.prototype.game = game;
// Default number of lives.
ScoreKeeper.prototype.lives = 3;
ScoreKeeper.prototype.score = 0;
// Default high score.
ScoreKeeper.prototype.highScore = 0;
// What increment in score is needed to progress through the levels.
ScoreKeeper.prototype.scorePerLevel = 4;
ScoreKeeper.prototype.currentLevel = function() {
    return Math.floor(this.score / this.scorePerLevel) + 1;
};
ScoreKeeper.prototype.add = function(n) {
    this.score += n;
};
ScoreKeeper.prototype.decreaseLives = function() {
    this.lives -= 1;
};
ScoreKeeper.prototype.save = function() {
    localStorage.score = this.score;
    localStorage.highScore = Math.max(this.score, this.highScore);
};
// Checks localstorage, useful across states.
ScoreKeeper.savedScoreIsHigh = function() {
    return localStorage.score >= localStorage.highScore;
};
ScoreKeeper.prototype.update = function() {
    this.text = "Lives: " + this.lives + "\nScore: " + this.score + "\nHigh Score: " + this.highScore;
};



// The score keeper records the level we are on, and this performs the
// display of the level we are on when the level changes.
var LevelDisplay = function() {
    Phaser.Text.call(this, this.game, this.game.world.centerX, -50,
        "", {
        fill: "#ffffff",
		font: "bold 36px Arial",
        align: "center",
	});
    this.anchor.set(0.5);

    this.game.add.existing(this);
};
LevelDisplay.prototype = Object.create(Phaser.Text.prototype);
LevelDisplay.prototype.game = game;
LevelDisplay.prototype.display = function(level) {
    level = level || 1;

    if (this.currentTween && this.currentTween.isRunning) {
        this.game.tweens.remove(this.currentTween);
    }

    this.text = "Level " + level;
    // Reset the positioning.
    this.x = this.game.world.centerX;
    this.y = -50;
    this.rotation = 0;
    this.scale.x = 1;
    this.scale.y = 1;


    // Hold reference in case we need to cancel early.
    // Scale is easier to manage than height and width given the
    // text size changes with different numbers/font. Tweening scale
    // requires two tweens chained together.
    this.currentTween = game.add.tween(this).to({
            y: this.game.world.centerY,
            rotation: 2 * Math.PI,
        }, 1000, Phaser.Easing.Linear.None);
    var shrink = game.add.tween(this.scale).to({
            x: 0,
            y: 0,
        }, 2000, Phaser.Easing.Linear.None);
    this.currentTween.chain(shrink);
    this.currentTween.start();
};

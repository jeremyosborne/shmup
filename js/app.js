/* jshint unused:true, undef:true, browser:true */
/* global Phaser:false */



// TODO: Componetize the motion into random paths or seeker pigs.



// Global game object.
var game = new Phaser.Game(
    // String dimensions are considered percentages of parent container.
    "100", "100",
    // Let Phaser choose the renderer.
    Phaser.AUTO,
    // What element do we want to use as the parent.
    document.querySelector(".game-container")
);



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



// Work in progress of a lightweight component system to add to the Phaser
// sprites.
// Notes while thinking: After reading online, and having worked with some
// component systems and the idea of entity-component-systems in the past,
// what I really want is the abstraction of composable types based on base types
// without enforcing hiearchy like a lot of objects in Phaser do. Just one
// type of game approach, we'll see if it works. I think what I most need is
// a good set of rules, and some testing.
//
// A mixin function that is passed a sprite that then augments the sprite.
var componentize = (function() {
    var componentMixin = Object.create(null);
    // Componentized promise to call init.
    // NOTE: Phase had a .components and this overwrote it. Ooops.
    componentMixin.componentsInit = function() {
        this._components = [];
    };
    // Componentized can add components to themselves.
    componentMixin.componentsAdd = function(c) {
        if (typeof c.init == "function") {
            c.init();
        }
        this._components.push(c);
    };
    // Componentized promise to call componentsUpdate.
    // Components are passed the sprite/entity. Sprite/entity promises
    // to provide all things needed for the component.
    componentMixin.componentsUpdate = function() {
        var num = this._components.length;
        for (var i = 0; i < num; i++) {
            // Components might want to reference themselves so we pass in
            // the sprite/entity as an arg.
            this._components[i].update(this);
        }
    };
    // Componentized might call componentsReset.
    // Components promise to have a reset.
    componentMixin.componentsReset = function() {
        var num = this._components.length;
        for (var i = 0; i < num; i++) {
            // Components might want to reference themselves so we pass in
            // the sprite/entity as an arg.
            this._components[i].reset(this);
        }
    };
    // Augment the entity/sprite prototype.
    return function(entity) {
        for (var prop in componentMixin) {
            entity.prototype[prop] = componentMixin[prop];
        }
        return entity;
    };
})();



// Creates a somewhat random path for the entity/sprite to travel across
// the screen.
var locomotionRandomWalkComponent = (function() {
    var proto = {
        randomPath: null,
        randomPathIndex: 0,
        init: function() {
            this.randomPath = randomPath({
                // Bounce up and down.
                xrange: [game.width, game.width - 100, game.width - 300, game.width - 500, 0],
                stepPercent: 0.005
            });
        },
        update: function(owner) {
            var p = this.randomPath[this.randomPathIndex];
            if (p) {
                owner.x = p.x;
                owner.y = p.y;

                this.randomPathIndex += 1;
            } else {
                // Kill when we run out of path. Assume that the path generates
                // to the edges of the screen, or when we want the pig to disappear.
                owner.kill();
            }
        },
        reset: function() {
            this.randomPathIndex = 0;
        }
    };

    return function() {
        return Object.create(proto);
    };
})();



// Entity will seek the target character.
var locomotionSeekerComponent = (function() {
    var proto = {
        // game.width lies during the initial load.
        //startX: game.width,
        startX: null,
        startY: null,
        init: function() {
            this.startX = game.width;
            this.startY = game.rnd.between(0, game.height);
        },
        update: function(owner) {
            // Pigs go from right to left.
            if (owner.target && game.physics.arcade.distanceBetween(owner, owner.target) > 5) {
                // NOTE: Adjust the rotation by PI because the game makes assumptions
                // all things point to the right (or more fairly angles are angles)
                // and our sprite is facing left by default.
                owner.rotation = game.physics.arcade.moveToObject(owner, owner.target, 125) + Math.PI;
            } else {
                owner.body.velocity.set(0);
            }
        },
        reset: function(owner) {
            owner.x = this.startX;
            owner.y = this.startY;
        }
    };

    return function() {
        return Object.create(proto);
    };
})();



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



// Start the game on the title screen.
game.state.start("title");

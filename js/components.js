/* jshint undef:true, browser:true */
/* global game:false */

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

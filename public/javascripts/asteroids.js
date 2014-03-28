/**
 * Created by jcaraballo17.
 */

var AsteroidsGame = (function(self) {
    "use strict";

    self.gameActive = false;
    self.gameTime = 0;
    self.score = 0;
    self.level = 0;

    var startTimeStamp = 0;
    var lastTimeStamp = 0;

    self.initialize = function() {
        self.configuration.loadConfigurations();
        self.graphics.initializeInterface();
        self.input.updateKeyBindings();
    };

    self.startAttractMode = function() {
        //TODO: develop ai for attract mode
    };

    self.startNewGame = function() {
        self.score = 0;
        self.gameActive = true;
        self.objects.ship.setPosition({ x: self.graphics.canvas.width/2, y: self.graphics.canvas.height/2 });
        startTimeStamp = lastTimeStamp = performance.now();
		requestAnimationFrame(gameLoop);
    };

    self.changeKeyConfig = function(config) {
        self.configuration.saveKeyConfig(config);
        self.input.updateKeyBindings();
    };

    self.changeAudioConfig = function(config) {
        self.configuration.saveAudioConfig(config);
    };

    function gameLoop(timestamp) {
        if (!self.gameActive) {
            return;
        }

        var elapsedTime = lastTimeStamp - timestamp;
        lastTimeStamp = timestamp;
        update(elapsedTime);
        render();

		requestAnimationFrame(gameLoop, null);
	}

    function update(elapsedTime) {
        self.gameTime = startTimeStamp - lastTimeStamp;
        self.objects.ship.moveForward(elapsedTime);
        //self.objects.ship.move somewhere depending on input
        //self.objects.asteroids.foreach( move in the direction they are going. )
    }

    function render() {
        self.graphics.clear();
        self.graphics.drawBackground();
        self.objects.ship.render();
    }

    return self;
}(AsteroidsGame || {}));
/**
 * Created by jcaraballo17.
 */

AsteroidsGame.objects = (function (self) {
    "use strict";

    self.ship = {};
    self.aliens = [];
    self.asteroids = [];
    self.laserShots = [];
    self.activeParticles = [];
    self.asteroidsCount = 3;

    self.alienInterval = 20000;
    self.nextAlienTimestamp = 0;
    self.lastAlienTimestamp = 0;

    var laserSpeedLimit = 3;
    var graphics = AsteroidsGame.graphics;
    var shipImage = graphics.images['images/assassin_ship.png'];
    var asteroidImage = graphics.images['images/asteroid_big1.png'];
    var alienImage = graphics.images['images/alien.png'];
    var laserImage = graphics.images['images/laser_shot.png'];

    self.alienTypes = {
        big: { size: 25 },
        small: { size: 15 }
    };

    self.asteroidTypes = {
        big: { size: 50 },
        medium: { size: 35 },
        small: { size: 20 }
    };
    self.asteroidTypes.big.split = { type: self.asteroidTypes.medium, amount: 3 };
    self.asteroidTypes.medium.split = { type: self.asteroidTypes.small, amount: 4 };

    self.loadShip = function (newX, newY) {
        var width = 20;
        var height = width * shipImage.height / shipImage.width;
        var initialX = graphics.canvas.width / 2;
        var initialY = graphics.canvas.height / 2;

        self.ship = Texture({
            image: shipImage,
            position: { x: newX || initialX, y: newY || initialY },
            size: { width: width, height: height },
            speed: { x: 0, y: 0 },
            angularSpeed: 300,
            maxSpeed: 3,
            angle: 60,
            acceleration: 2,
            frictionFactor: .997,
            lastShotTimestamp: 0,
            laserThrottle: 200
        });
    };

    self.loadLaserShot = function (timestamp, shooter, angle) {
        if (timestamp - shooter.lastShotTimestamp < shooter.laserThrottle) {
            return;
        }

        var xComponent = Math.sin(angle * Math.PI / 180);
        var yComponent = Math.cos(angle * Math.PI / 180);

        var width = 2;
        var height = width * laserImage.height / laserImage.width + 5;

        self.laserShots.push(Texture({
            image: laserImage,
            position: { x: shooter.position.x, y: shooter.position.y },
            size: { width: width, height: height },
            speed: { x: 2 * xComponent * laserSpeedLimit, y: 2 * yComponent * laserSpeedLimit },
            angularSpeed: 0,
            maxSpeed: laserSpeedLimit,
            angle: angle,
            timestamp: timestamp,
            lifespan: 1000,
            acceleration: 5,
            shooter: shooter,
            frictionFactor: 1
        }));

        AsteroidsGame.audio.playLaserFx();
        shooter.lastShotTimestamp = timestamp;
    };

    self.loadAlien = function (timestamp) {
        var alienType = [self.alienTypes.big, self.alienTypes.small, self.alienTypes.big]
            .splice(Random.nextRange(0, 2), 1)
            .pop();

        var width = alienType.size;
        var height = width * asteroidImage.height / asteroidImage.width;

        var sides = [
            { x: 0, angle: 90 },
            { x: graphics.canvas.width, angle: 270 }
        ];
        var yPosition = Random.nextRange(0, graphics.canvas.height);
        var startSide = sides.splice(Random.nextRange(0, 1), 1).pop();
        var endSide = sides.pop().x;

        self.aliens.push(Texture({
            image: alienImage,
            position: { x: startSide.x, y: yPosition },
            size: { width: width, height: height },
            speed: { x: 0, y: 0 },
            angularSpeed: 0,
            maxSpeed: 2,
            angle: startSide.angle,
            acceleration: 2,
            type: alienType,
            frictionFactor: 0.98,
            destination: endSide,
            lastShotTimestamp: 0,
            laserThrottle: 2000
        }));

        self.lastAlienTimestamp = timestamp;
    };

    self.loadAsteroids = function (amount, asteroidType, position) {
        var width = asteroidType.size;
        var height = width * asteroidImage.height / asteroidImage.width;
        var offset = { x: graphics.canvas.width * 0.15 / 2, y: graphics.canvas.height * 0.15 / 2 };

        while (amount--) {
            var range = {
                left: Random.nextRange(0, self.ship.position.x - offset.x),
                right: Random.nextRange(self.ship.position.x + offset.x, graphics.canvas.width),
                up: Random.nextRange(0, self.ship.position.y - offset.y),
                down: Random.nextRange(self.ship.position.y + offset.y, graphics.canvas.height)
            };

            var xPosition = (position) ? position.x : [range.left, range.right].splice(Random.nextRange(0, 1), 1).pop();
            var yPosition = (position) ? position.y : [range.up, range.down].splice(Random.nextRange(0, 1), 1).pop();

            self.asteroids.push(Texture({
                image: asteroidImage,
                position: { x: xPosition, y: yPosition },
                size: { width: width, height: height },
                speed: { x: Random.nextDoubleRange(-1.5, 1.5), y: Random.nextDoubleRange(-1.5, 1.5) },
                angularSpeed: Random.nextGaussian(55, 10),
                angle: Random.nextRange(10, 350),
                acceleration: 0,
                maxSpeed: 1.5,
                type: asteroidType,
                frictionFactor: 1
            }));
        }
    };

    self.astAlienCollision = function (adding) {
        var deleteAsters = [];
        var deleteAlien = [];

        adding = adding || false;
        var detected = false;
        self.asteroids.forEach(function (asteroid) {
            self.aliens.forEach(function (alien) {
                if (detectTouch(asteroid, alien)) {

                    if (!adding) {
                        addParticles(alien);
                        deleteAlien.push(alien);
                        deleteAsters.push(asteroid);
                    }
                    detected = true;
                }
            });

        });

        deleteAsters.forEach(function (asteroid) {
            self.asteroids.splice(self.asteroids.indexOf(asteroid), 1);
            splitAsteroid(asteroid);
            AsteroidsGame.audio.playRockExplosionFx();
        });

        deleteAlien.forEach(function (alien) {
            self.aliens.splice(self.aliens.indexOf(alien), 1);
            AsteroidsGame.audio.playShipExplosionFx();
        });

        return detected;
    };

    self.astShipCollision = function (adding) {
        adding = adding || false;
        var detected = false;
        self.asteroids.forEach(function (asteroid) {
            if (detectTouch(asteroid, self.ship)) {

                if (!adding) {
                    addParticles(self.ship);
                    newShip();
                }
                detected = true;
            }
        });

        return detected;
    };

    self.alienShipCollision = function (adding) {
        var deleteAlien = [];
        adding = adding || false;
        var detected = false;
        self.aliens.forEach(function (alien) {
            if (detectTouch(alien, self.ship)) {
                //alien and ship collided - call explosion function for ship
                if (!adding) {
                    addParticles(self.ship);
                    deleteAlien.push(alien);
                    newShip();
                }
                detected = true;
            }
        });

        deleteAlien.forEach(function (alien) {
            self.aliens.splice(self.aliens.indexOf(alien), 1);
            AsteroidsGame.audio.playShipExplosionFx();
        });

        return detected;

    };


    self.shotCollision = function () {
        var deleteAsters = [];
        var deleteShots = [];
        var deleteAlien = [];

        self.laserShots.forEach(function (shot) {

            self.asteroids.forEach(function (asteroid) {
                if (detectTouch(shot, asteroid)) {
                    //explode that asteroid now!
                    console.log("asteroid explosion");
                    addParticles(asteroid);
                    deleteAsters.push(asteroid);
                    deleteShots.push(shot);
                    if (shot.shooter == self.ship) {
                        if (asteroid.size.width == self.asteroidTypes.big.size) {
                            AsteroidsGame.score += 20;
                        } else if (asteroid.size.width == self.asteroidTypes.medium.size) {
                            AsteroidsGame.score += 50;
                        } else if (asteroid.size.width == self.asteroidTypes.small.size) {
                            AsteroidsGame.score += 100;
                        }
                    }

                }
            });

            self.aliens.forEach(function (alien) {
                if (detectTouch(shot, alien)) {
                    //explode that alien now!
                    if (shot.shooter != alien) {
                        console.log("alien explosion!");
                        addParticles(alien);
                        deleteShots.push(shot);
                        deleteAlien.push(alien);
                        if (alien.size.width == self.alienTypes.big.size) {
                            AsteroidsGame.score += 200;
                        } else if (alien.size.width == self.alienTypes.small.size) {
                            AsteroidsGame.score += 1000;
                        }
                    }
                }
            })

            if (shot.shooter != self.ship) {
                if (detectTouch(shot, self.ship)) {
                    //shot and ship collided - call explosion function for ship
                    console.log("mayday! we've been hit!");
                    addParticles(self.ship);
                    deleteShots.push(shot);
                    newShip();
                }
            }
        });


        deleteAsters.forEach(function (asteroid) {
            self.asteroids.splice(self.asteroids.indexOf(asteroid), 1);
            splitAsteroid(asteroid);
            AsteroidsGame.audio.playRockExplosionFx();
        });

        deleteAlien.forEach(function (alien) {
            self.aliens.splice(self.aliens.indexOf(alien), 1);
            AsteroidsGame.audio.playShipExplosionFx();
        });

        deleteShots.forEach(function (shot) {
            self.laserShots.splice(self.laserShots.indexOf(shot), 1);
        });
    };

    function splitAsteroid(asteroid) {
        var split = asteroid.type.split;
        if (!split) {
            return;
        }
        self.loadAsteroids(split.amount, split.type, asteroid.position);
    }

    function addParticles(spec) {
        var particles = particleSystem({
            image: AsteroidsGame.graphics.images['images/fire.png'],
            center: {x: spec.position.x, y: spec.position.y},
            speed: {mean: 50, stdev: 25},
            lifetime: {mean: 5, stdev: 1}
        }, AsteroidsGame.graphics);

        self.activeParticles.push({particle: particles, lifetime: 1500, timealive: 0});
    }

    function newShip() {
        AsteroidsGame.audio.playShipExplosionFx();
        AsteroidsGame.lives--;

        var COLL_FACTOR = 12;
        self.ship = {};
        self.loadShip();

        self.ship.size.width *= COLL_FACTOR;//This is to make the collision bigger for a small second (seriously, really small)
        self.ship.size.height *= COLL_FACTOR;

        while (self.astShipCollision(true) || self.alienShipCollision(true)) {
            self.ship = {};
            var randX = Random.nextRange(10, graphics.canvas.width - 10);
            var randY = Random.nextRange(10, graphics.canvas.height - 10);

            self.loadShip(randX, randY);
            self.ship.size.width *= COLL_FACTOR;
            self.ship.size.height *= COLL_FACTOR;
        }

        self.ship.size.width /= COLL_FACTOR;
        self.ship.size.height /= COLL_FACTOR;
    }


    function detectTouch(object, element) {
        var distToOthers = calcDistance(object.position.x,
            object.position.y,
            element.position.x,
            element.position.y);
        var bothRadius = (element.size.width + element.size.height) / 4
            + (object.size.width + object.size.height) / 4;
        return distToOthers <= bothRadius;
    }

    function calcDistance(x1, y1, x2, y2) {
        return Math.sqrt((Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2)));
    }

    function Texture(spec) {
        var that = spec;

        that.initialAngle = that.angle;

        that.rotateRight = function (elapsedTime) {
            that.angle += that.angularSpeed * (elapsedTime / 1000);
            that.angle = ((that.angle < 0) ? 360 - Math.abs(that.angle) : that.angle) % 360;
        };

        that.rotateLeft = function (elapsedTime) {
            that.angle -= that.angularSpeed * (elapsedTime / 1000);
            that.angle = ((that.angle < 0) ? 360 - Math.abs(that.angle) : that.angle) % 360;
        };

        that.moveForward = function (elapsedTime) {
            move(elapsedTime, that.angle);
        };

        that.moveInInitialDirection = function (elapsedTime) {
            move(elapsedTime, that.initialAngle);
        };

        that.moveInAngle = function (angle, elapsedTime) {
            move(elapsedTime, angle);
        };

        that.render = function () {
            graphics.context.save();

            graphics.context.translate(that.position.x, that.position.y);
            graphics.context.rotate(that.angle * Math.PI / 180);
            graphics.context.translate(-that.position.x, -that.position.y);

            graphics.context.drawImage(
                that.image,
                that.position.x - that.size.width / 2,
                that.position.y - that.size.height / 2,
                that.size.width, that.size.height
            );

            graphics.context.restore();
        };

        that.update = function () {
            var canvasWidth = graphics.canvas.width;
            var canvasHeight = graphics.canvas.height;

            var newPositionX = that.position.x + that.speed.x;
            that.position.x = ((newPositionX <= 0) ? canvasWidth : newPositionX) % (canvasWidth + 1);
            var newPositionY = that.position.y - that.speed.y;
            that.position.y = ((newPositionY <= 0) ? canvasHeight : newPositionY) % (canvasHeight + 1);

            that.speed.x *= that.frictionFactor;
            that.speed.y *= that.frictionFactor;
        };

        function move(elapsedTime, angle) {
            var time = elapsedTime / 1000;
            var radiansAngle = angle * Math.PI / 180;
            var xComponent = Math.sin(radiansAngle);
            var yComponent = Math.cos(radiansAngle);

            var dx = that.acceleration * xComponent * time;
            var dy = that.acceleration * yComponent * time;

            var overSpeed = Math.sqrt(Math.pow(that.speed.y, 2) + Math.pow(that.speed.x, 2)) > that.maxSpeed;

            that.speed.x = (overSpeed) ? that.speed.x : that.speed.x + dx;
            that.speed.y = (overSpeed) ? that.speed.y : that.speed.y + dy;
        }

        return that;
    }

    return self;
}(AsteroidsGame.objects || {}));
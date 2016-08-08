var ballSize, 
		containerSize = {},
		$ballCollection = $(".ball"),
		$ball = $ballCollection[0],
		defaultVelocity = 20,
		ballObjects = {},
		defaultMass;

//deceleration is at 1020 pixels^2/sec, or 1.02 pixels^2/millisecond

// remove on throw complete


/***************************************************************
***************************************************************/

var frictionProof = function(){
	/*
		@fn the code used to determine best friction variable,
					plug into onThrowComplete, gets you 0.539
	*/
	var ball = this.vars.data.ballObject,
			velocity = ball.getVelocityInfo(),
			time = new Date().getTime(),
			diff = (time-ball.previousVelocity.time)/1000,
			previousPostion = ball.previousVelocity.position,
			currentPosition = ball.getBallPosition(),
			distance = Math.sqrt(Math.pow(currentPosition.x- previousPostion.x,2)+Math.pow(currentPosition.y- previousPostion.y,2)),
			deceleration = (velocity.scalar-ball.previousVelocity.velocity.scalar)/diff;
	var calculatedDistance = 0.539*0.5*Math.pow(ball.previousVelocity.velocity.scalar,2)/1000;
	console.log(diff, calculatedDistance, distance, distance/calculatedDistance);
}

var Ball = function(DOM, position, direction, id){
	this.id = id;
	this.element = DOM;
	this.normalizedVector = direction;
	// this.velocity = defaultVelocity;
	this.position = {};
	this.coasting = true;			// if object is not decelerating, make it coast
	this.setBallPosition(position);
	this.previousVelocity = {};
	// this.previousData = {};
	this.velocityTracker = VelocityTracker.track(this.element, "x,y");
};
Ball.prototype.getBallPosition = function(){
	return {
		x: this.element._gsTransform.x,
		y: this.element._gsTransform.y
	};
};
Ball.prototype.setBallPosition = function(position){
	this.position.x = position.x;
	this.position.y = position.y;
};
// Ball.prototype.getVelocityVector = function(){
// 	return {
// 		x : this.velocity * this.normalizedVector.x,
// 		y : this.velocity * this.normalizedVector.y
// 	}
// };
Ball.prototype.getVelocityInfo = function() {
	// TODO: Using VelocityTracker, return magnitude and velocity vector
	var x = this.velocityTracker.getVelocity('x'),
			y = this.velocityTracker.getVelocity('y');
	return {
		x : x,
		y : -y,				// y coordinates start from zero, making it negative reorientates the velocity
		scalar : vectorMagnitude(x, y).toFixed(2)
	};
};

var calculateBallMass = function(ballDiameter){
	return Math.pow((ballDiameter/2), 2) * Math.PI;
}

var initializeNewBall = function(index){
	// TODO: creates a ball object and adds it to ballObjects dictionary
	//				returns newly created object
	
	var	initialDirection = getVectorFromDegrees(getRandomDirection()),
			randomPosition, 
			ball,
			element = $ballCollection[index],
			id = index;

	randomPosition = {
		x : Math.random()*(containerSize.width - ballSize) + ballSize/2,
		y : Math.random()*(containerSize.height - ballSize) + ballSize/2
	};
	ball = new Ball(element, randomPosition, initialDirection, id);
	TweenLite.set(element, {x:randomPosition.x, y:randomPosition.y, xPercent: -50, yPercent: -50});
	Draggable.create(element, {
		type: "x,y", 
		// bounds: ".container",
		onDragStart : function(){
			var ball = this.vars.data.ballObject;
			// console.log("start");
			ball.recentlyResolvedWallCollision = "";
		},
		onDrag: ballPositionUpdate,
		onThrowUpdate: ballPositionUpdate,
		onThrowComplete: monitorBehavior,
		onRelease: monitorBehavior,
		ballIndex: i,
		throwProps: true,
		throwResistance: 0,
		overshootTolerance: 0,
		data : {
			ballObject : ball
		}
	});
	ballObjects[id] = ball;
	return ball;
};


/***************************************************************
***************************************************************/

Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};
 
// Converts from radians to degrees.
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};


var getTimeWithVelocity = function(pathLength, velocity) {
	// TODO: Calculate how much time it takes to travel 
	//				the pathlength at the velocity
	return pathLength/velocity;
}

var reanimateBall = function(ball){
	// TODO: Checks the location of the ball, if it is off the screen, 
	//				bring it back into the center of the screen. Then reanimate at a slow pace
	if(!ball){
		ball = this.vars.data.ballObject;
	}
	try {
		animateTowardDirection(ball);
	}
	catch(err) {
		console.log("ReanimateBall did not work...");
	}
	ball.coasting = true;
};

var animateDecelerationFromVelocity = function(resultVelocity, ballObject) {
	// TODO: Takes the current velocity and decelerates at
	//				the approximate rate of deceleration -1000.
	//				Returns the end position, and how much time it will take
	//				The end position may not be in bounds
	var currentPosition = ballObject.getBallPosition();
	var currentVelocity = ballObject.getVelocityInfo().scalar;
	var remainingTime = currentVelocity/1000; // -1000 ~= force of friction (F_u) = (v_f-v_i)/time(sec)
	var expectedDistance = 0.539*0.5*Math.pow(currentVelocity,2)/1000;		// very close estimate to what distance would travel from toss
	var resultScalar = Math.sqrt(Math.pow(resultVelocity.x,2) + Math.pow(resultVelocity.y, 2));
	var multiplier = expectedDistance/resultScalar;
	var endPosition = {
		x : currentPosition.x + (multiplier * resultVelocity.x),
		y : currentPosition.y + (multiplier * -resultVelocity.y)
	};

	TweenLite.to(ballObject.element, remainingTime, {
		x: endPosition.x, 
		y: endPosition.y, 
		onUpdate: ballPositionUpdate, 
		data: {
			ballObject : ballObject
		},
		onComplete: reanimateBall
	});
};

var vectorMagnitude = function(x, y){
	return Math.sqrt((x*x)+(y*y));
};



var monitorBehavior = function(e) {
	// TODO: onRelease draggable event. gets released position and uses it as intial vector
	var ball = this.vars.data.ballObject;
			
	ball.coasting = false;
	
	setTimeout(function(){
		/*
			@fn monitor the ball's status after a second
					if it's no longer moving, reanimate the ball

		*/
		var ballVelocity = ball.getVelocityInfo();
		// console.log(ballVelocity.scalar);
		if(parseInt(ballVelocity.scalar) == 0){
			// ball is no longer moving, reanimate ball
			reanimateBall(ball);
		}
	}, 1000);
};

var getRandomDirection = function(){
	// TODO: gets a random number between 0 to 360 degrees
	return Math.random()*360;
};

var getVectorFromDegrees = function(degreeDirection){
	// TODO: returns the directional vector based on given angle in degrees
	//				of a normalized direction vector
	return {
		x : (Math.cos(Math.radians(degreeDirection))).toFixed(6),
		y : (Math.sin(Math.radians(degreeDirection))).toFixed(6)
	};
};


var getEndWallPosition = function(currentPosition, vectorDirection){
	// TODO: returns the x and y end position object is moving torwards
	//				relative to bounding container
	// ALGORITHM: 1) determine the direction that has largest difference
	//						2) constrain that end position to the boudning box
	var finalPosition = {},
			delta = {},
			scale; 
	if(vectorDirection.x >= 0) {
		// moving positive x direction
		delta.x = (containerSize.width - ballSize/2) - currentPosition.x;
	} else {
		delta.x = ballSize/2 - currentPosition.x;
	}
	if(vectorDirection.y >= 0) {
		// moving positive y direction
		delta.y = ballSize/2 - currentPosition.y;
	} else {
		delta.y = (containerSize.height - ballSize/2) - currentPosition.y;
	}
	if(Math.abs(vectorDirection.x) > Math.abs(vectorDirection.y)){
		scale = Math.abs(delta.x/vectorDirection.x);
		if(Math.abs(scale*vectorDirection.y) <= Math.abs(delta.y)){
			// within bounds of delta container (will reach x first)
			finalPosition.x = currentPosition.x + delta.x;
			finalPosition.y = currentPosition.y - (scale*vectorDirection.y);
		} else {
			// Not within bounds of delta container (will reach y first)
			scale = Math.abs(delta.y/vectorDirection.y);
			finalPosition.x = currentPosition.x + (scale*vectorDirection.x);
			finalPosition.y = currentPosition.y + delta.y;
		}
	} else {
		scale = Math.abs(delta.y/vectorDirection.y);
		if(Math.abs(scale*vectorDirection.x) <= Math.abs(delta.x)){
			// within bounds of delta container (will reach y first)
			finalPosition.x = currentPosition.x + (scale*vectorDirection.x);
			finalPosition.y = currentPosition.y + delta.y;
		} else {
			// Not within bounds of delta container (will reach x first)
			scale = Math.abs(delta.x/vectorDirection.x);
			finalPosition.x = currentPosition.x + delta.x;
			finalPosition.y = currentPosition.y - (scale*vectorDirection.y);
		}
	}
	finalPosition.pathLength = Math.sqrt(Math.pow(currentPosition.x-finalPosition.x, 2)+Math.pow(currentPosition.y-finalPosition.y, 2));
	return finalPosition;

};



var animateTowardDirection = function(ball, vector){
	// TODO: animates the ball to a certain wall based on the vector
	var endPosition, animationTime;
	if(vector) {
		ball.normalizedVector = vector;
	}
	endPosition = getEndWallPosition(ball.getBallPosition(), ball.normalizedVector);
	animationTime = getTimeWithVelocity(endPosition.pathLength, defaultVelocity);

	TweenLite.to(ball.element, animationTime, {
		x: endPosition.x, 
		y: endPosition.y, 
		ease: Power0.easeNone, 
		data: {ballObject : ball}, 
		onUpdate: ballPositionUpdate
	});

}

function getInitialLayout(){
	var tmp = $(".container")[0];
	ballSize = $ball.offsetWidth;
	defaultMass = calculateBallMass(ballSize);
	containerSize.width = tmp.offsetWidth;
	containerSize.height = tmp.offsetHeight;
	collisionWorker.postMessage({type:"layout", ballSize: ballSize, containerSize: containerSize});
};









/**********************************************************************
**********************************************************************/


var collisionWorker = new Worker("./js/collision-worker.js");
var ballPositionUpdate = function(){
	// TODO: update the collision worker with the latest ball position
	// console.log(this);
	var ballObject = this.vars.data.ballObject,
			elementPosition = ballObject.getBallPosition(),
			ballVelocity = ballObject.getVelocityInfo();

	
	
	// console.log(elementPosition);
	collisionWorker.postMessage({
		type:"ballPosition",
		id: ballObject.id,
		position: elementPosition,
		velocityVector: ballVelocity,
		mass: defaultMass
		

	});
	
};
collisionWorker.addEventListener("message", function(e){
	var data = e.data;
	switch(data.type) {
		case "wallCollision":
			var ball = ballObjects[data.id];
			// console.log("HIT!", ball.getVelocityInfo());
			ball.normalizedVector = data.normalizedVector;
			if(ball.coasting){
				animateTowardDirection(ball);
			} else if(ball.recentlyResolvedWallCollision != data.wallOfCollision){
				ball.recentlyResolvedWallCollision = data.wallOfCollision;
				animateDecelerationFromVelocity(data.resultVelocity, ball);
				// console.log("HIT WALL-> RESPONSE", data.resultVelocity);
			}
			// console.log(data.resultVelocity);
			// animateTowardDirection(ballObjects[data.id], data.resultVelocity);
			break;
		case "velocity": 
			// var ball = ballObjects[data.id];
			// console.log("current velocity of ball " + data.id + " is " + data.velocity);
			// console.log(data.normalizedVector);
			// ball.normalizedVector = data.normalizedVector;
			// console.log(ball.normalizedVector);
			// console.log(data.velocity);
			// ball.previousVelocity = data.velocity;
			// if(data.velocity <= defaultVelocity && ball.checkVelocity) {
			// 	ball.checkVelocity = false;
			// 	animateTowardDirection(ball, ball.normalizedVector);
			// }
			break;
		case "ACK":
			console.log('got it');
			break;
	}
}, false);
collisionWorker.addEventListener('error', function(e){
	console.log('ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message);
}, false);

optimizedResize.add(function(){
	getInitialLayout();
});


/****************************************************************
**********************************************************************/


getInitialLayout();

for(var i = 0, length = $ballCollection.length; i < length; i++){
	
	var endPosition,
			animationTime,
			ball;
	
	
	ball = initializeNewBall(i);
	animateTowardDirection(ball);
}

// TweenLite.to($ball, 5, {x: 300, onUpdate:showCoordinates, onUpdateParams:[$ball]});


// TODO:
// - Get balls to move
// - detect collision of wall.. on main thread?
// - get angle or direction ball is moving in vector math?
// - have collision worker detect if balls collided
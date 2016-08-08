Math.dotProduct = function(vector1, vector2) {
	return (vector1.x * vector2.x) + (vector1.y * vector2.y);
}

Math.distance = function(x1, y1, x2, y2){
	return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
};

Math.vectorAdd = function(vector1, vector2) {
	return {
		x: vector2.x + vector1.x,
		y: vector2.y + vector1.y
	};
}

Math.normalizeVector = function(vector){
	// TODO: takes a vector and returns the normalized vector
	var length = Math.sqrt(Math.pow(vector.x,2) + Math.pow(vector.y, 2));
	return {
		x : vector.x/length,
		y : vector.y/length
	};
};

function resultantVelocity(velocity1, velocity2, mass1, mass2){
	// TODO: This function uses momentum (p = m * v), kinetic energy = 1/2*m*v^2,
	//				conservation of energy and conservation of momentum to give the resulant
	//				velocity after collision of velocity 1
	var resultantVelocity1 = ((velocity1 * (mass1 - mass2)) + (2*mass2*velocity2))/(mass1 + mass2);
	return resultantVelocity1;
};

var ballCollisionResponse = function(object1, object2){
	// TODO: Collision response to two objects colliding
	// REF: http://simonpstevens.com/articles/vectorcollisionphysics
	var vector1 = object1.velocityVector,
			vector2 = object2.velocityVector,
			position1 = object1.position,
			position2 = object2.position,
			distanceApart = 0,
			normalPlane, 
			collisionPlane,
			vector1Components = {},
			vector2Components = {},
			mass = 10,
			finalVector1 = {},
			finalVector2 = {},
			wallCollision = false;

	if(vector2.x == 0 && vector2.y == 0){
		wallCollision = true;
	}
	
	// Need distance apart to calculate the normalised normal plane (the vector connecting the center of the two balls)
	distanceApart = Math.distance(position1.x, position1.y, position2.x, position2.y);
	normalPlane = {
		x : (position2.x - position1.x)/distanceApart,
		y : (position2.y - position1.y)/distanceApart
	}

	// Collision plane is the tangent of the collision of two balls
	// it is perpendicular to the normal, rotate the normal plane by 90 degrees
	// done by flipping the two vector components and multiplying the first by -1
	collisionPlane = {
		x : -1 * normalPlane.y,
		y : normalPlane.x
	};

	// calculate dot products of each vector along the collision plane and normal plane
	vector1Components.normalScalar = Math.dotProduct(normalPlane, vector1);
	vector1Components.collisionScalar = Math.dotProduct(collisionPlane, vector1);
	
	if(wallCollision){
		vector2Components.normalScalar = -1 * Math.dotProduct(normalPlane, vector1);
	} else {
		vector2Components.normalScalar = Math.dotProduct(normalPlane, vector2);
	}
	vector2Components.collisionScalar = Math.dotProduct(collisionPlane, vector2);

	
	vector1Components.resultVelocity = resultantVelocity(vector1Components.normalScalar, vector2Components.normalScalar, mass, mass);
	vector2Components.resultVelocity = resultantVelocity(vector2Components.normalScalar, vector1Components.normalScalar, mass, mass);

	// calculate final vectors
	finalVector1 = {
		x : (vector1Components.resultVelocity*normalPlane.x) + (vector1Components.collisionScalar*collisionPlane.x),
		y : (vector1Components.resultVelocity*normalPlane.y) + (vector1Components.collisionScalar*collisionPlane.y)
	};
	finalVector2 = {
		x : (vector2Components.resultVelocity*normalPlane.x) + (vector2Components.collisionScalar*collisionPlane.x),
		y : (vector2Components.resultVelocity*normalPlane.y) + (vector2Components.collisionScalar*collisionPlane.y)
	};
	return {
		vector1 : finalVector1,
		vector2 : finalVector2
	};
};

var getVectorFromPoints = function(start, end) {
	// TODO: returns the vector created from two points
	return {
		x : (end.x - start.x).toFixed(6),
		y : -(end.y - start.y).toFixed(6)
	}
};

var calculateWallCollision = function(wallContactPosition, ballObject){
	// TODO: returns the final velocity vector of ball that ran into wall
	var vectorResponse = ballCollisionResponse(ballObject, {position: wallContactPosition, velocityVector : {x:0, y:0}}).vector1;
	return vectorResponse;
};

var containerSize, ballSize;

function checkWallCollision(ballInfo){
	// TODO: calculates if ball hits the wall, if it does return message of wall collision
	var ballPosition = ballInfo.position;
	if(ballPosition.x <= ballSize/2 || ballPosition.y <= ballSize/2
		|| (ballPosition.x+ballSize/2) >= containerSize.width
		|| (ballPosition.y+ballSize/2) >= containerSize.height) {

		var wallContactPosition = {},
				resultVelocity,
				wallOfCollision;
		if(ballPosition.x <= ballSize/2) {
			wallContactPosition.x = 0;
			wallContactPosition.y = ballPosition.y;
			wallOfCollision = "left";
		} else if(ballPosition.y <= ballSize/2 ) {
			wallContactPosition.x = ballPosition.x;
			wallContactPosition.y = 0;
			wallOfCollision = "top";
		} else if ((ballPosition.x+ballSize/2) >= containerSize.width) {
			wallContactPosition.x = containerSize.width;
			wallContactPosition.y = ballPosition.y;
			wallOfCollision = "right";
		} else if((ballPosition.y+ballSize/2) >= containerSize.height) {
			wallContactPosition.x = ballPosition.x;
			wallContactPosition.y = containerSize.height;
			wallOfCollision = "bottom";
		}
		resultVelocity = calculateWallCollision(wallContactPosition, ballInfo);
		self.postMessage({
			type:"wallCollision", 
			resultVelocity: resultVelocity,
			normalizedVector: Math.normalizeVector(resultVelocity),
			id: ballInfo.id,
			wallOfCollision : wallOfCollision
		});
	}

};

var checkVelocity = function(data){
	// TODO: takes data from previous calculations to get current velocity
	var previous = data.previousData, current = data.currentData;
	var distance = Math.distance(previous.position.x, previous.position.y, current.position.x, current.position.y);
	var time = previous.time - current.time;
	var vector = Math.normalizeVector(getVectorFromPoints(previous.position, current.position));
	self.postMessage({
		type:"velocity", 
		id: data.id, 
		velocity: parseInt(Math.abs(1000*distance/time)), // 1000 is to make this velocity per second
		directionVector : vector
	});			
};

self.addEventListener('message', function(e){
	var data = e.data;
	switch(data.type){
		case "layout":
			containerSize = data.containerSize;
			ballSize = data.ballSize;
			break;
		case "ballPosition":
			checkWallCollision(data);
			break;
		case "checkVelocity":
			checkVelocity(data);
			break;
		case 'end':
			// terminates current worker
			// or from main thread call worker.terminate()
			self.close();
			break;

	}
}, false);
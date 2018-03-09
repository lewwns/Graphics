// WangSylvia-ProjA

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
	'attribute vec4 a_Color;\n' +
	'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
	'  v_Color = a_Color;\n' +
  '}\n';

  // Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
	'varying vec4 v_Color;\n' +
  'void main() {\n' +
	'  gl_FragColor = v_Color;\n' +
  '}\n';

// Rotation angle (degrees/second)
var ANGLE_STEP = 100.0;
var SQUARE_ANGLE_STEP = 45.0;

// fish
var FISH_STEP = 30.0;
var FISH_MAXANGLE = 40.0;
click = 1.0;
FISH_Angle = 0.0;
FISH_posn = 0.0;

// sphere
var sphereposn = 0;



// Global vars for mouse click-and-drag for rotation.
      var isDrag=false;		
      var xMclik=0.5;			
      var yMclik=-0.5;   
      var xMdragTot=0.0;
      var yMdragTot=0.0;  



currentAngle = 0.0;
squareangle = 0.0;

key1 = false;
key2 = false;

floatsPerVertex = 8;



////// main

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Write the positions of vertices to a vertex shader
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel
	// unless the new Z value is closer to the eye than the old one..
	//	gl.depthFunc(gl.LESS);
	gl.enable(gl.DEPTH_TEST);

  // Get storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Model matrix
  var modelMatrix = new Matrix4();



  ///// tick
  var tick = function() {

  		if(sphereposn > 2.6){
  			sphereposn = 0;
  		}
  		else
  			sphereposn += 0.005;



		currentAngle = animateShip(currentAngle);
		squareangle = animateSquare(squareangle);

		if (click === 1) {
			update = fish_up(FISH_Angle, FISH_posn);
			FISH_Angle = update[0];
			FISH_posn = update[1];
		}
		else if (click === -1) {
			update = fish_down(FISH_Angle, FISH_posn);
			FISH_Angle = update[0];
			FISH_posn = update[1];
		}
		
		draw(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix);   // Draw the triangle
    	requestAnimationFrame(tick, canvas); // Request that the browser calls tick
  	}; 
  	///// tick end

	tick();

///// mouse and keys
 	canvas.onmousedown = function(ev){myMouseDown(ev, gl, canvas);};
	canvas.onmousemove = function(ev){myMouseMove(ev, gl, canvas);};
	canvas.onmouseup = function(ev){myMouseUp(ev, gl, canvas);};

	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);



}
///// main end




///// points

function initVertexBuffers(gl) {
  vertices = new Float32Array (937 * 8); 

	makeAnimal();
	makeFish();

	// 171


///// bubbles 700
	makeSphere();
	for(i = 135 * 8, j = 0; j < sphVerts.length; i++, j++) {
		vertices[i] = sphVerts[j];
		}



// 171+700 = 871



// squares 6

makeSquare();



	///// put into vertices
  for (i = 835 * 8, j = 0; j < square.length; i++, j++) {
		vertices[i] = square[j];
	}


// 871 + 6 = 877


makeCube();



// 877 + 48 = 925


makeCone();

// 910


makeHead();


  var n = 937; 



//////
// Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	var FSIZE = vertices.BYTES_PER_ELEMENT;

  // Assign the buffer object to a_Position variable
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE * 8, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

	var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
	if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }

	// Use handle to specify how to retrieve color data from our VBO:
	gl.vertexAttribPointer(
		a_Color, 				// choose Vertex Shader attribute to fill with data
		4, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
		gl.FLOAT, 			// data type for each value: usually gl.FLOAT
		false, 					// did we supply fixed-point data AND it needs normalizing?
		FSIZE * 8, 			// Stride -- how many bytes used to store each vertex?
										// (x,y,z,w, r,g,b) * bytes/value
		FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
										// value we will actually use?  Need to skip over x,y,z,w

	gl.enableVertexAttribArray(a_Color);
										// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
	// Unbind the buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return n;
}
///// points end






///// draw

function draw(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix) {

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // animal

  drawAnimal(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix);

//// fish

  drawFish(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix);

/// bubbles

  drawBubbles(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix);

////// square

  drawSquare(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix);

/////// draw cube

	drawCube(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix);


	drawLeaf(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix);



}
///// draw end





// Last time that this function was called
var ship_last = Date.now();

function animateShip(angle) {
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - ship_last;
  ship_last = now;
  // Update the current rotation angle (adjusted by the elapsed time)



  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;

  return newAngle %= 360;
}


// Last time that this function was called:  (used for animation timing)
var s_last = Date.now();

function animateSquare(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - s_last;
  s_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  if(angle >   20.0 && SQUARE_ANGLE_STEP > 0) SQUARE_ANGLE_STEP = -SQUARE_ANGLE_STEP;
  if(angle <  -60.0 && SQUARE_ANGLE_STEP < 0) SQUARE_ANGLE_STEP = -SQUARE_ANGLE_STEP;
  
  var newAngle = angle + (SQUARE_ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}


/////
///// move fish

var fish_last = Date.now();
function fish_down(angle, pos) {
	var now = Date.now();
	var elapsed = now - fish_last;
	fish_last = now;
	var newAngle = angle - (FISH_STEP * elapsed) / 1000.0;

	if (newAngle < 0) {
		newAngle = 0;
	}

	pos = pos + elapsed / 5000.0;
	if (pos > 0) {
		pos = 0;
	}

	return [newAngle %= 360, pos];
}


function fish_up(angle, pos) {
	var now = Date.now();
	var elapsed = now - fish_last;
	fish_last = now;
	var newAngle = angle + (FISH_STEP * elapsed) / 1000.0;

	if (newAngle > FISH_MAXANGLE) {
		newAngle = FISH_MAXANGLE;
	}

	pos = pos - elapsed / 5000.0;
	if (pos < -0.3) {
		pos = -0.3;
	}

	return [newAngle %= 360, pos];
}




///// key and mouse



function myKeyDown(ev) {
  switch(ev.keyCode) {
    case 13:
      key1 = true;
      break;

    case 65:
    	key2 = true;
    	break;

  }
}

function myKeyUp(ev) {
  switch(ev.keyCode) {
    case 13:
      key1 = false;
      break;


   case 65:
   		key2 = false;
   		break;
  }
}



function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);

	isDrag = true;											
	xMclik = x;													
	yMclik = y;
}

function myMouseMove(ev, gl, canvas) {

  	if(isDrag==false) return;				

			var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
			var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
			var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge

			// Convert to Canonical View Volume (CVV) coordinates too:
			var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
									 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
			var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
									 (canvas.height/2);

			// find how far we dragged the mouse:
			xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
			yMdragTot += (y - yMclik);
			xMclik = x;													// Make next drag-measurement from here.
			yMclik = y;
		
}

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

if (click == 1) {
	click = -1;
}
else{
	click = 1;
}

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);

	isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);
	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
}




function reset() {
	ANGLE_STEP = 20.0;

	FISH_STEP = 30.0;

	FISH_MAXANGLE = 60.0;

	currentAngle = 0.0;

	squareangle = 0.0;

	click = -1.0;
	FISH_Angle = 0.0;
	FISH_posn = 0.0;

	key1 = false;
	key2 = false;
	
	xMdragTot = 0.0;
	yMdragTot = 0.0;

	sphereposn = 0;

}



////////

function makeAnimal() {

	animal = [

		// ears 24
		// front
		0.1,    1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  1.0, ///// posn0
		0.2,    0.6, 0.05,  1.0,           0.0,  0.8,  0.0,  1.0, ///// posn1
	    0.05,   0.6, 0.05,  1.0,           0.0,  1.0,  0.0,  1.0, ///// posn2

	    // back
		0.1,   1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  1.0, ///// posn0
		0.2,   0.6, -0.1,  1.0,           0.0,  0.8,  0.0,  1.0, ///// posn3
	    0.05,  0.6, -0.1,  1.0,           0.0,  1.0,  0.0,  1.0, ///// posn4

	    // left
		0.1,   1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  1.0, ///// posn0
	    0.05,  0.6, -0.1,  1.0,           0.0, 0.8,  0.0,  1.0, ///// posn4
	    0.05,  0.6,  0.05,  1.0,          0.0, 1.0,  0.0,  1.0, ///// posn2

	    // right
		0.1,  1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  1.0, ///// posn0
		0.2,  0.6, -0.1,  1.0,          0.0,  0.8,  0.0,  1.0, ///// posn3
		0.2,  0.6,  0.05,  1.0,         0.0,  1.0,  0.0,  1.0, /////posn1



		// front 
		-0.1,    1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  1.0, ///// posn0
		-0.05,    0.6, 0.05,  1.0,         0.0,  0.8,  0.0,  1.0, ///// posn1
	    -0.2,   0.6, 0.05,  1.0,           0.0,  1.0,  0.0,  1.0, ///// posn2

		// back 
		-0.1,   1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  1.0, ///// posn0
		-0.05,   0.6, -0.1,  1.0,           0.0,  0.8,  0.0,  1.0, ///// posn3
	    -0.2,  0.6, -0.1,  1.0,           0.0,  1.0,  0.0,  1.0, ///// posn4

		// left
		-0.1,   1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  1.0, ///// posn0
	    -0.2,  0.6, -0.1,  1.0,           0.0,  0.8,  0.0,  1.0, ///// posn4
	    -0.2,  0.6,  0.05,  1.0,          0.0,  1.0,  0.0,  1.0, ///// posn2

	    // right
		-0.1,  1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  1.0, ///// posn0
		-0.05,  0.6, -0.1,  1.0,           0.0, 0.8,  0.0,  1.0, ///// posn3
		-0.05,  0.6,  0.05,  1.0,          0.0,  1.0,  0.0,  1.0, /////posn1


		// body 48
		// top
	  -0.2,  0.6, -0.2,  1.0,           0.0,  0.5,  0.5,  1.0, ///// posn10
       0.2,  0.6, -0.2,  1.0,           0.2,  0.3,  0.6,  1.0, ///// posn11
	  -0.2,  0.6,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, ///// posn2
	  -0.2,  0.6,  0.2,  1.0,           0.0,  0.5,  0.5,  1.0, ///// posn2
	   0.2,  0.6,  0.2,  1.0,           0.2,  0.3,  0.6,  1.0, ///// posn1
	   0.2,  0.6, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, ///// posn11

		//  bottom
		-0.2,  0.1, -0.2,  1.0,          0.0,  0.5,  0.5,  1.0, /////posn8
		 0.2,  0.1, -0.2,  1.0,        	 0.2,  0.3,  0.6,  1.0,  /////posn9
	    -0.2,  0.1,  0.2,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn6
	  -0.2,  0.1,  0.2,  1.0,           0.0,  0.5,  0.5,  1.0,/////posn6
	   0.2,  0.1,  0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn7
	   0.2,  0.1, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn9

		// front
		-0.2,  0.1,  0.2,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn6 
		-0.2,  0.6,  0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn2
		 0.2,  0.6,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn1
		-0.2,  0.1,  0.2,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn6
		 0.2,  0.1,  0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn7
		 0.2,  0.6,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn1

		// back
	  -0.2,  0.6, -0.2,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn10
	  -0.2,  0.1, -0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn8
	   0.2,  0.1, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn9
	  -0.2,  0.6, -0.2,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn10
	   0.2,  0.6, -0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn11
	   0.2,  0.1, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn9

		// left
		-0.2,  0.6,  0.2,  1.0,          0.2,  0.3,  0.6,  1.0, /////posn2
		-0.2,  0.6, -0.2,  1.0,          0.0,  0.5,  0.5,  1.0, /////posn10
		-0.2,  0.1, -0.2,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn8
		-0.2, 0.1, -0.2,  1.0,          0.0,  0.5,  0.5,  1.0, /////posn8
		-0.2, 0.1,  0.2,  1.0,          0.2,  0.3,  0.6,  1.0, /////posn6
		-0.2, 0.6,  0.2,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn2

		//  right
		0.2,  0.6,  0.2,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn1
		0.2,  0.6, -0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn11
		0.2,  0.1, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn9
		0.2, 0.1, -0.2,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn9
		0.2, 0.1,  0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn7
		0.2, 0.6,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn1



		// feet 30
		

	0.0,   0.0,  0.2,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn13
   -0.25,  0.0, -0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn14
    0.0,   0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn15
   -0.25, 0.0,  0.2,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn12
    0.0,  0.0,  0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn13
   -0.25, 0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn14

-0.2,  0.1,  0.1,  1.0,           0.0,  0.5,  0.5,  1.0,  /////posn6
-0.25, 0.0,  0.2,  1.0,           0.2,  0.3,  0.6,  1.0,  /////posn12
 0.0,  0.0,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn13
-0.05,  0.1,  0.1,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn7
-0.2,   0.1,  0.1,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn6
 0.0,   0.0,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn13


-0.2,  0.1, -0.1,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn8
-0.25, 0.0, -0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn14
 0.0,  0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn15
-0.05,  0.1, -0.1,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn9
-0.2,   0.1, -0.1,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn8
 0.0,   0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn15


	 -0.25, 0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn14
	 -0.25, 0.0,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn12
	 -0.2,  0.1,  0.1,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn6
     -0.2,  0.1, -0.1,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn8
	 -0.2,  0.1,  0.1,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn6
	 -0.25, 0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn14


	 -0.05,  0.1,  0.1,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn7
	 -0.05,  0.1, -0.1,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn9
	  0.0,   0.0,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn13
     -0.05,  0.1, -0.1,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn9
	  0.0,   0.0,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn13
	  0.0,   0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn15




	  ///// another

	0.25, 0.0,  0.2,  1.0,          0.0,  0.5,  0.5,  1.0, /////posn13
	 0.0,  0.0, -0.2,  1.0,            0.2,  0.3,  0.6,  1.0, /////posn14
	  0.25, 0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn15
		0.0, 0.0,  0.2,  1.0,            0.0,  0.5,  0.5,  1.0, /////posn12
		0.25, 0.0,  0.2,  1.0,            0.2,  0.3,  0.6,  1.0, /////posn13
	 0.0,  0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn14


	 0.05,  0.1,  0.1,  1.0,           0.0,  0.5,  0.5,  1.0,  /////posn6
	 0.0, 0.0,  0.2,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn12
	 0.25, 0.0,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn13
     0.2,  0.1,  0.1,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn7
	 0.05,  0.1,  0.1,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn6
	  0.25, 0.0,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn13

	 
	 0.05,  0.1, -0.1,  1.0,           0.0,  0.5,  0.5,  1.0, /////posn8
	 0.0,  0.0, -0.2,  1.0,            0.2,  0.3,  0.6,  1.0, /////posn14
	  0.25, 0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn15
     0.2,  0.1, -0.1,  1.0,            0.0,  0.5,  0.5,  1.0, /////posn9
     0.05,  0.1, -0.1,  1.0,           0.2,  0.3,  0.6,  1.0, /////posn8
	  0.25, 0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn15


	 0.0,   0.0, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn14
	 0.0,   0.0,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn12
	 0.05,  0.1,  0.1,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn6
     0.05,  0.1, -0.1,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn8
	 0.05,  0.1,  0.1,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn6
	 0.0,   0.0, -0.2,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn14


	 0.2,  0.1,  0.1,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn7
	 0.2,  0.1, -0.1,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn9
	 0.25, 0.0,  0.2,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn13
     0.2,  0.1, -0.1,  1.0,          1.0,  1.0, 0.0,  1.0, /////posn9
	 0.25, 0.0,  0.2,  1.0,          1.0,  1.0, 0.0,  1.0, /////posn13
     0.25, 0.0, -0.2,  1.0,          1.0,  1.0, 0.0,  1.0, /////posn15

///// 120

 


  ];


  for (i = 0, j = 0; j < animal.length; i++, j++) {
		vertices[i] = animal[j];
	}



}

function makeFish() {

	// fish 15

	fish = [

	// 1
	 0.0,  0.0, 0.0, 1.0, 				1.0, 0.0, 0.0, 1.0,
	-0.1, -0.1, 0.0, 1.0, 				0.0, 1.0, 0.0, 1.0,
	 0.1, -0.1, 0.0, 1.0,				0.0, 0.0, 1.0, 1.0,

	 // 2
	 0.0,  0.0, 0.0, 1.0, 				1.0, 0.0, 0.0, 1.0,
	-0.2, 0.1, 0.0, 1.0,				1.0, 1.0, 0.0, 1.0,
	 0.2, 0.1, 0.0, 1.0, 				1.0, 0.0, 1.0, 1.0,


	 // 3
	 0.2,  0.1, 0.0, 1.0, 				1.0, 0.0, 1.0, 1.0,
	-0.2,  0.1, 0.0, 1.0, 				1.0, 1.0, 0.0, 1.0,
	 0.2,  0.3, 0.0, 1.0,				1.0, 0.0, 0.0, 1.0,

	 // 4
	 0.2, 0.3, 0.0, 1.0, 				1.0, 0.0, 0.0, 1.0,
	-0.2, 0.3, 0.0, 1.0,				1.0, 1.0, 0.0, 1.0,
	-0.2, 0.1, 0.0, 1.0, 				1.0, 0.0, 1.0, 1.0,


	// 5
	 0.2, 0.3, 0.0, 1.0, 				1.0, 0.0, 1.0, 1.0,
	-0.2, 0.3, 0.0, 1.0,				1.0, 1.0, 0.0, 1.0,
	 0.0, 0.4, 0.0, 1.0, 				1.0, 0.0, 0.0, 1.0,


	];

  for (i = 120 * 8, j = 0; j < fish.length; i++, j++) {
		vertices[i] = fish[j];
	}

	/////  15. 135
}


function makeSquare() {


square = [

 	 0.0, 0.0, 0.0, 1.0,			1.0, 0.0, 0.0, 1.0,		// first triangle   (x,y,z,w==1)
     0.0, 0.2, 0.0, 1.00,  			0.0, 1.0, 0.0, 1.0,
     0.2, 0.0, 0.0, 1.00,			0.0, 0.0, 1.0, 1.0,

     0.2, 0.2, 0.0, 1.00,			0.0, 1.0, 0.0, 1.0,	// second triangle
     0.0, 0.2, 0.0, 1.00,  			0.0, 0.0, 1.0, 1.0,
     0.2, 0.0, 0.0, 1.00,			1.0, 0.0, 0.0, 1.0,

	]

	///// 6 141
}


function makeCube() {

	///// cube 48

cube = [


		//    top side      //
		0.0,  0.6,  0.0,  1.0,           1.0,  0.5,  0.0,  1.0, ///// posn5
		0.2,  0.6,  0.2,  1.0,           1.0,  1.0,  1.0,  1.0, ///// posn1
	   -0.2,  0.6,  0.2,  1.0,           1.0,  0.5,  0.0,  1.0, ///// posn2

	  0.0,  0.6,  0.0,  1.0,           1.0,  0.5,  0.0,  1.0, ///// posn5
	  0.2,  0.6, -0.2,  1.0,           1.0,  0.5,  0.0,  1.0, ///// posn3
	 -0.2,  0.6, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, ///// posn4

	  0.0,  0.6,  0.0,  1.0,           1.0,  0.5,  0.0,  1.0, ///// posn5
	 -0.2,  0.6,  0.2,  1.0,           1.0,  0.5,  0.0,  1.0, ///// posn2
	 -0.2,  0.6, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, ///// posn4

	  0.0,  0.6,  0.0,  1.0,           1.0,  0.5,  0.0,  1.0, ///// posn5
	  0.2,  0.6,  0.2,  1.0,           1.0,  0.5,  0.0,  1.0, ///// posn1
	  0.2,  0.6, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, ///// posn3

		//    bottom side   //
		-0.2,  0.1, -0.2,  1.0,         1.0,  0.5,  0.0,  1.0, /////posn8
		 0.2,  0.1, -0.2,  1.0,         1.0,  0.5,  0.0,  1.0,/////posn9
	 -0.2,  0.1,  0.2,  1.0,         	1.0,  1.0,  0.0,  1.0, /////posn6

	  -0.2,  0.1,  0.2,  1.0,           1.0,  0.5,  0.0,  1.0, /////posn6
	  0.2,  0.1,  0.2,  1.0,           1.0,  0.5,  0.0,  1.0, /////posn7
	  0.2,  0.1, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn9

	 //  0.0, 0.0,  0.0,  1.0,           1.0,  1.0,  1.0,  1.0,
	 // 0.0, 0.0,  0.0,  1.0,           1.0,  1.0,  1.0,  1.0,
	 // 0.0, 0.0, 0.0,  1.0,           1.0,  1.0,  1.0,  1.0,

	 //  0.0, 0.0,  0.0,  1.0,           1.0,  1.0,  1.0,  1.0,
	 //  0.0, 0.0,  0.0,  1.0,           1.0,  1.0,  1.0,  1.0,
	 //  0.0, 0.0,  0.0,  1.0,           1.0,  1.0,  1.0,  1.0,

		//     front side    //
		-0.2,  0.1,  0.2,  1.0,           1.0,  0.0,  0.0,  1.0, /////posn6 
		-0.2,  0.6,  0.2,  1.0,           1.0,  0.0,  0.0,  1.0, /////posn2
		 0.2,  0.6,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn1
		-0.2,  0.1,  0.2,  1.0,           1.0,  0.0,  0.0,  1.0, /////posn6
		 0.2,  0.1,  0.2,  1.0,           1.0,  0.0,  0.0,  1.0, /////posn7
		 0.2,  0.6,  0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn1

		//    back side     //
	  -0.2,  0.6, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn10
	  -0.2,  0.1, -0.2,  1.0,           1.0,  0.0,  0.0,  1.0, /////posn8
	   0.2,  0.1, -0.2,  1.0,           1.0,  0.0,  0.0,  1.0, /////posn9
	  -0.2,  0.6, -0.2,  1.0,           1.0,  1.0,  0.0,  1.0, /////posn10
	   0.2,  0.6, -0.2,  1.0,           1.0,  0.0,  0.0,  1.0, /////posn11
	   0.2,  0.1, -0.2,  1.0,           1.0,  0.0,  0.0,  1.0, /////posn9

		//    left side     //
		-0.2,  0.6,  0.2,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn2
		-0.2,  0.6, -0.2,  1.0,          1.0,  0.0,  0.0,  1.0, /////posn10
		-0.2,  0.1, -0.2,  1.0,          1.0,  0.0,  0.0,  1.0, /////posn8

		-0.2, 0.1, -0.2,  1.0,          1.0,  1.0,  0.0,  1.0, /////posn8
		-0.2, 0.1,  0.2,  1.0,          1.0,  0.0,  0.0,  1.0, /////posn6
		-0.2, 0.6,  0.2,  1.0,          1.0,  0.0,  0.0,  1.0, /////posn2

		//    right side    //
		0.2,  0.6,  0.2,  1.0,           1.0,  1.0,  0.3,  1.0, /////posn1
		0.2,  0.6, -0.2,  1.0,           1.0,  0.0,  0.3,  1.0, /////posn11
		0.2,  0.1, -0.2,  1.0,           1.0,  0.0,  0.3,  1.0, /////posn9

		0.2, 0.1, -0.2,  1.0,           1.2,  1.0,  0.3,  1.0, /////posn9
		0.2, 0.1,  0.2,  1.0,           1.2,  0.0,  0.3,  1.0, /////posn7
		0.2, 0.6,  0.2,  1.0,           1.2,  0.0,  0.3,  1.0, /////posn1


]

///// put into vertices
  for (i = 841 * 8, j = 0; j < cube.length; i++, j++) {
		vertices[i] = cube[j];
	}


	///// 42 183

}



function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.0, 0.0, 0.5, 1.0]);	// North Pole: light gray
  var equColr = new Float32Array([0.0, 0.0, 1.0, 1.0]);	// Equator:    bright green
  var botColr = new Float32Array([0.0, 0.0, 0.5, 1.0]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				sphVerts[j+2] = cos0;		
				sphVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;																				// z
				sphVerts[j+3] = 1.0;																				// w.		
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];
				sphVerts[j+7]=topColr[3];	
	
				}
			else if(s==slices-1) {
				sphVerts[j+4]=botColr[0]; 
				sphVerts[j+5]=botColr[1]; 
				sphVerts[j+6]=botColr[2];	
				sphVerts[j+7]=botColr[3];					
			}
			else {
					sphVerts[j+4]=equColr[0]; 
					sphVerts[j+5]=equColr[1]; 
					sphVerts[j+6]=equColr[2]-0.015*v;
					sphVerts[j+7]=1.0; //Math.random();	

			}
		}
	}

	///// 700 883
}



function makeCone(){

	cone = [

	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.0, 1.0, //posn0
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 1.0, //posn1
   	0.0, -0.1, 0.2, 1.0,		0.0, 0.5, 0.0, 1.0, //posn2

   	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.0, 1.0,//posn0
   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 0.0, 1.0,//posn2
   	0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 1.0,//posn3


   	0.0, -0.1, 0.2, 1.0, 		0.0, 1.0, 0.0, 1.0,//posn2
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 1.0,//posn1
   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 0.0, 1.0,//posn3



	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.0, 1.0, //posn0
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 1.0, //posn1
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.5, 0.0, 1.0, //posn4

	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.0, 1.0, //posn0
   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 0.0, 1.0,//posn3
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.8, 0.0, 1.0, //posn4


   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 1.0, //posn1
   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 0.0, 1.0,//posn2
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.0, 1.0,//posn5

   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 0.0, 1.0,//posn2
   	0.2, -0.2, 0.0, 1.0, 		0.0, 1.0, 0.0, 1.0,//posn3
   	0.0, -0.4, 0.0, 1.0,		0.0, 0.8, 0.0, 1.0,//posn5


   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 0.0, 1.0,//posn3
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.8, 0.0, 1.0, //posn4
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.0, 1.0,//posn5

   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 1.0, //posn1
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.5, 0.0, 1.0, //posn4
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.0, 1.0,//posn5




]
   	///// put into vertices
  for (i = 883 * 8, j = 0; j < cone.length; i++, j++) {
		vertices[i] = cone[j];
	}

///// 27 910


}


function makeHead(){

head = [

	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 1.0, 1.0, //posn0
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.8, 1.0, //posn1
   	0.0, -0.1, 0.2, 1.0,		0.0, 0.5, 0.5, 1.0, //posn2

   	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 1.0, 1.0,//posn0
   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 0.8, 1.0,//posn2
   	0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.5, 1.0,//posn3


   	0.0, -0.1, 0.2, 1.0, 		0.0, 1.0, 1.0, 1.0,//posn2
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.8, 1.0,//posn1
   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 0.5, 1.0,//posn3



	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.1, 1.0, //posn0
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.8, 1.0, //posn1
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.5, 0.5, 1.0, //posn4

	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 1.0, 1.0, //posn0
   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 0.8, 1.0,//posn3
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.8, 0.5, 1.0, //posn4


   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 1.0, 1.0, //posn1
   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 0.8, 1.0,//posn2
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.5, 1.0,//posn5

   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 1.0, 1.0,//posn2
   	0.2, -0.2, 0.0, 1.0, 		0.0, 1.0, 0.8, 1.0,//posn3
   	0.0, -0.4, 0.0, 1.0,		0.0, 0.8, 0.5, 1.0,//posn5


   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 1.0, 1.0,//posn3
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.8, 0.8, 1.0, //posn4
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.5, 1.0,//posn5

   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 1.0, 1.0, //posn1
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.5, 0.8, 1.0, //posn4
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.5, 1.0,//posn5




]
   	///// put into vertices
  for (i = 910 * 8, j = 0; j < head.length; i++, j++) {
		vertices[i] = head[j];


	}



}

// 910 + 27


function drawAnimal(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix){


	modelMatrix.setTranslate(0.0, 0.5, 0.0); ///// the position

	modelMatrix.scale(0.5, 0.5, 0.5);


	if(key2){
				modelMatrix.rotate(currentAngle*0.8, 0, 1, 0);

	}
	else{
				modelMatrix.rotate(currentAngle*0.8, 1, 1, 0);

	}

	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  	gl.drawArrays(gl.TRIANGLES, 0, 120);


	pushMatrix(modelMatrix); 

}

function drawFish(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix){

	radian = Math.PI * FISH_Angle / 180.0; // Convert to radians
		cosB = Math.cos(radian);
		sinB = Math.sin(radian);

		
		/// 1
	
		modelMatrix.setTranslate(-0.5, -0.5 , 0.0); ///// the position
		pushMatrix(modelMatrix);
		modelMatrix.scale(1.5, 1.5, 1.5);
		modelMatrix.rotate(FISH_Angle, 0, 0, 1);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLES, 120, 15); //cc

		/// 2
		modelMatrix = popMatrix();
		modelMatrix.translate(-0.05, 1.0, 0.0);
		modelMatrix.rotate(270, 0, 0, 1.0);
		modelMatrix.rotate(FISH_Angle, 0, 0, 1);
		pushMatrix(modelMatrix);
		modelMatrix.scale(1.0, 1.0, 1.0);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLES, 120, 15); //cc

		/// 3
		modelMatrix = popMatrix();
		modelMatrix.translate(1.0, 1.0, 0.0);
		modelMatrix.rotate(FISH_Angle*0.8, 0, 0, 1);
		modelMatrix.scale(0.5, 0.5, 0.5);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLES, 120, 15); //cc
}

function drawBubbles(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix){


	for(i=0; i<2; i++){
  modelMatrix.setTranslate( 0.6-0.2*i, sphereposn-1.05, 0.0); // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(0.2,0.2,-0.2);							// convert to left-handed coord sys
  									
if(key1){  																				// to match WebGL display canvas.
  	modelMatrix.scale(0.6, 0.6, 0.6);
}
else{
	modelMatrix.scale(0.3, 0.3, 0.3);

}

  modelMatrix.rotate(currentAngle*0.5, 0, 1, 0);  // Make new drawing axes that

  						// Make it smaller:
  // modelMatrix.rotate(currentAngle*i, 1, 0, 0);  
  // modelMatrix.rotate(squareangle*0.8, 0, 1, 0);  

	// Drawing:		
	// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							135,	// start at this vertex number, and 
  							700);	// draw this many vertices.

	}
}

function drawSquare(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix){

///// head

// follow first
for (i=0; i<4; i++){
	///// change row
	modelMatrix.setTranslate(xMclik, yMclik-0.2*0.2*i, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  modelMatrix.scale(0.2,0.2,0.2);
  //modelMatrix.rotate(currentAngle, 0, 0, 1);  // Make new drawing axes that
  						// that spin around z axis (0,0,1) of the previous 
  						// drawing axes, using the same origin.
	//modelMatrix.translate(-0.1, 0,0);						// Move box so that we pivot
							// around the MIDDLE of it's lower edge, and not the left corner.
  // DRAW BOX:  Use this matrix to transform & draw our VBO's contents:
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw the rectangle held in the VBO we created in initVertexBuffers().
  gl.drawArrays(gl.TRIANGLES, 835, 6);

	for(j=0; j<4; j++){
		////// for each row

  modelMatrix.translate(0.2, 0, 0); 			// Make new drawing axes that
  						
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 835, 6);

	
	}
}




////// tails


for(i=1 ;i<4; i++){

	///// first
	modelMatrix.setTranslate(xMclik+(0.2*0.2)*i, yMclik-(0.2*4*0.2), 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  modelMatrix.scale(0.2,0.2,0.2);
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw the rectangle held in the VBO we created in initVertexBuffers().
  gl.drawArrays(gl.TRIANGLES, 835, 6);


// follow first and move

for(j=0; j<10; j++){

  modelMatrix.translate(0.02, -0.1*0.2, 0); 			// Make new drawing axes that
  						// we moved upwards (+y) measured in prev. drawing axes, and
  						// moved rightwards (+x) by half the width of the box we just drew.
  modelMatrix.scale(0.7,0.7,0.7);				// Make new drawing axes that
  						// are smaller that the previous drawing axes by 0.6.
  modelMatrix.rotate(squareangle*0.8, 0,0,1);	// Make new drawing axes that
  						// spin around Z axis (0,0,1) of the previous drawing 
  						// axes, using the same origin.
  modelMatrix.translate(0.0, -0.1, 0);			// Make new drawing axes that
  						// move sideways by half the width of our rectangle model
  						// (REMEMBER! modelMatrix.scale() DIDN'T change the 
  						// the vertices of our model stored in our VBO; instead
  						// we changed the DRAWING AXES used to draw it. Thus
  						// we translate by the 0.1, not 0.1*0.6.)
  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 835, 6);


	}
  }
}

 function drawCube(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix){


// body first
modelMatrix.setTranslate(0.1, -0.1, -1.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  modelMatrix.scale(0.5,0.5,0.5);
  modelMatrix.rotate(squareangle*0.1, 1, 0, 1);  // Make new drawing axes that
  						// that spin around z axis (0,0,1) of the previous 
  						// drawing axes, using the same origin.
  modelMatrix.rotate(currentAngle, 0, 1, 0);
	//modelMatrix.translate(-0.1, 0,0);						// Move box so that we pivot
							// around the MIDDLE of it's lower edge, and not the left corner.
  // DRAW BOX:  Use this matrix to transform & draw our VBO's contents:
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw the rectangle held in the VBO we created in initVertexBuffers().
  gl.drawArrays(gl.TRIANGLES, 841, 42);


  // body follow first

  for(j=0; j<10; j++){

modelMatrix.translate(0.0, -0.32, 0); 			// Make new drawing axes that
  						// we moved upwards (+y) measured in prev. drawing axes, and
  						// moved rightwards (+x) by half the width of the box we just drew.
  modelMatrix.scale(0.7,0.7,0.7);				// Make new drawing axes that
  						// are smaller that the previous drawing axes by 0.6.
  modelMatrix.rotate(squareangle*0.2*j, 0,0,1);	// Make new drawing axes that
  						// spin around Z axis (0,0,1) of the previous drawing 
  						// axes, using the same origin.
  
  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 841, 42);

	}




// attenna

for(i=0 ;i<2; i++){

//first

modelMatrix.setTranslate(0.05+i*0.1, 0.2, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  modelMatrix.scale(0.12,0.12,0.12);
  modelMatrix.rotate(squareangle, 1, 0, 1);  // Make new drawing axes that
  						// that spin around z axis (0,0,1) of the previous 
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw the rectangle held in the VBO we created in initVertexBuffers().
  gl.drawArrays(gl.TRIANGLES, 841, 42);

	
// follow first

for(j=0; j<10; j++){

	modelMatrix.translate(0.0, 0.6, 0); 			// Make new drawing axes that
  						// we moved upwards (+y) measured in prev. drawing axes, and
  						// moved rightwards (+x) by half the width of the box we just drew.
  modelMatrix.scale(0.7,0.7,0.7);				// Make new drawing axes that
  						// are smaller that the previous drawing axes by 0.6.
  modelMatrix.rotate(squareangle*0.8, 0,0,1);	// Make new drawing axes that
  						// spin around Z axis (0,0,1) of the previous drawing 
  						// axes, using the same origin.
  modelMatrix.translate(0.0, -0.1, 0);			// Make new drawing axes that
  						// move sideways by half the width of our rectangle model
  						// (REMEMBER! modelMatrix.scale() DIDN'T change the 
  						// the vertices of our model stored in our VBO; instead
  						// we changed the DRAWING AXES used to draw it. Thus
  						// we translate by the 0.1, not 0.1*0.6.)
  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 841, 42);

	}
}

}

 function drawLeaf(gl, n, currentAngle, squareangle, modelMatrix, u_ModelMatrix){



// body first
modelMatrix.setTranslate(0.5, sphereposn-1.0, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
 modelMatrix.scale(1.2,0.8,0.8);
  // modelMatrix.rotate(currentAngle*0.5, 0, 1, 0);  // Make new drawing axes that
  						// that spin around z axis (0,0,1) of the previous 
  						// drawing axes, using the same origin.
 // modelMatrix.rotate(currentAngle, 0, 1, 0);
	// modelMatrix.translate(-0.1, 0,0);						// Move box so that we pivot
							// around the MIDDLE of it's lower edge, and not the left corner.
  // DRAW BOX:  Use this matrix to transform & draw our VBO's contents:
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw the rectangle held in the VBO we created in initVertexBuffers().
  gl.drawArrays(gl.TRIANGLES, 910, 27);




//////

  modelMatrix.setTranslate(0.5, sphereposn-1.0-0.1, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
 modelMatrix.scale(0.2,0.2,0.2);
  modelMatrix.rotate(currentAngle*0.5, 0.0, 1.0, 0.0);  // Make new drawing axes that
  						// that spin around z axis (0,0,1) of the previous 
  						// drawing axes, using the same origin.
 // modelMatrix.rotate(currentAngle, 0, 1, 0);
	// modelMatrix.translate(-0.1, 0,0);						// Move box so that we pivot
							// around the MIDDLE of it's lower edge, and not the left corner.
  // DRAW BOX:  Use this matrix to transform & draw our VBO's contents:
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw the rectangle held in the VBO we created in initVertexBuffers().
  gl.drawArrays(gl.TRIANGLES, 883, 27);


  // body follow first

  for(j=0; j<6; j++){

modelMatrix.translate(0.0, -0.3, 0.0); 			// Make new drawing axes that
  						// we moved upwards (+y) measured in prev. drawing axes, and
  						// moved rightwards (+x) by half the width of the box we just drew.
  modelMatrix.scale(1.2,1.2,1.2);				// Make new drawing axes that
  						// are smaller that the previous drawing axes by 0.6.
  modelMatrix.rotate(squareangle*0.2*j, 0,0,1);	// Make new drawing axes that
  						// spin around Z axis (0,0,1) of the previous drawing 
  						// axes, using the same origin.
  
  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 883, 27); //cc

	}




 }



//==================HTML Button Callbacks


function stop() {
 SQUARE_ANGLE_STEP = 0;
 ANGLE_STEP = 0; 
}

function spin() {
  SQUARE_ANGLE_STEP = (SQUARE_ANGLE_STEP + 1) * 2; 
  ANGLE_STEP = (ANGLE_STEP + 1) * 2;
}

 


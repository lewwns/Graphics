    // Vertex shader program
    var VSHADER_SOURCE =
      'attribute vec4 a_Position;\n' +
      'attribute vec4 a_Color;\n' +
      'attribute vec4 a_Normal;\n' +  
      
      'uniform mat4 u_MvpMatrix;\n' +
      'uniform mat4 u_ModelMatrix;\n' +
      'uniform mat4 u_NormalMatrix;\n' +  

      'varying vec3 v_Position;\n' +
      'varying vec4 v_Color;\n' +
      'varying vec3 v_Normal;\n' +

      'void main() {\n' +
      '  gl_Position = u_MvpMatrix * a_Position;\n' +
      '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
      '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
      '  v_Color = a_Color;\n' +
      '  gl_PointSize = 1.0;\n' +
      '}\n';

    // Fragment shader program
    var FSHADER_SOURCE =
      '#ifdef GL_ES\n' +
      'precision mediump float;\n' +
      '#endif\n' +

      'uniform vec3 u_LightColor;\n' +          
      'uniform vec3 u_LightPosition;\n' +       
      'uniform vec3 u_AmbientLightColor;\n' +   
      'uniform vec4 u_ColorMod;\n' +         

      'varying vec4 v_Color;\n' +
      'varying vec3 v_Normal;\n' +
      'varying vec3 v_Position;\n' + 

      'void main() {\n' +
      '  vec3 normal = normalize(v_Normal);\n' +
      '  vec3 lightDirection = normalize(u_LightPosition-v_Position);\n' +
      '  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
      '  vec4 modColor = v_Color + u_ColorMod;\n' +
      '  vec3 diffuse = u_LightColor * modColor.rgb * nDotL;\n' +
      '  vec3 ambient = u_AmbientLightColor * modColor.rgb;\n' + 
      '  gl_FragColor = vec4(diffuse+ambient, modColor.a);\n' +
      '}\n';

    var ANGLE_STEP = 45.0; 
    var TREE_ANGLE_STEP = 45.0; 
    var floatsPerVertex = 10; 
                              
    var MOVE_STEP = 0.15;
    var LOOK_STEP = 0.02;
    var PHI_NOW = 0;
    var THETA_NOW = 0;
    var LAST_UPDATE = -1;

    var modelMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var projMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();
    var normalMatrix = new Matrix4();
    var colorMod = new Vector4();

    var c30 = Math.sqrt(0.75);
    var sq2 = Math.sqrt(2.0);

    var currentAngle = 0.0;
    var treeAngle = 0.0;

    var ANGLE_STEP = 45.0;  // default rotation angle rate (deg/sec)

    var isDrag=false;   // mouse-drag: true when user holds down mouse button
    var xMclik=0.0;     // last mouse button-down position (in CVV coords)
    var yMclik=0.0;   
    var xMdragTot=0.0;  // total (accumulated) mouse-drag amounts (in CVV coords).
    var yMdragTot=0.0;  

    var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
    var qTot = new Quaternion(0,0,0,1); // 'current' orientation (made from qNew)
    var quatMatrix = new Matrix4();       // rotation matrix, made from latest qTot

      

    //var canvas;
    function main() {
    //==============================================================================
      // Retrieve <canvas> element
      canvas = document.getElementById('webgl');
      canvas.width=window.innerWidth;
      canvas.height=window.innerHeight*(4/5);

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

      // NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
      // unless the new Z value is closer to the eye than the old one..
      //  gl.depthFunc(gl.LESS);       
      gl.enable(gl.DEPTH_TEST); 
      
      // Set the vertex coordinates and color (the blue triangle is in the front)
      var n = initVertexBuffers(gl);

      if (n < 0) {
        console.log('Failed to specify the vertex infromation');
        return;
      }

      canvas.onmousedown  = function(ev){myMouseDown( ev, gl, canvas) }; 
              // when user's mouse button goes down, call mouseDown() function
      canvas.onmousemove =  function(ev){myMouseMove( ev, gl, canvas) };
                        // when the mouse moves, call mouseMove() function          
      canvas.onmouseup =    function(ev){myMouseUp(   ev, gl, canvas)};

      // Specify the color for clearing <canvas>
      gl.clearColor(0.0, 0.0, 0.0, 1.0);

      // Get the storage locations of u_ViewMatrix and u_ProjMatrix variables
      var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
      var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
      var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
      var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
      var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
      var u_AmbientLightColor = gl.getUniformLocation(gl.program, 'u_AmbientLightColor');
      var u_ColorMod = gl.getUniformLocation(gl.program, 'u_ColorMod');
      
      if (!u_MvpMatrix || !u_ModelMatrix || !u_NormalMatrix || !u_LightColor || !u_LightPosition || !u_AmbientLightColor || !u_ColorMod) { 
        console.log('Failed to get the location of uniform variables');
        return;
      }
     
      gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
      gl.uniform3f(u_LightPosition, 10.0, 10.0, 10.0);
      gl.uniform3f(u_AmbientLightColor, 0.3, 0.3, 0.3);

     document.onkeydown = function(ev){ keydown(ev, gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas); };

     
     var tick = function() {
        currentAngle = animate(currentAngle);
        treeAngle = animatetree(treeAngle);
        draw(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);   // Draw the triangles
        requestAnimationFrame(tick, canvas);   
                          
     };

     tick(); 

    }

    function initVertexBuffers(gl) {
    //==============================================================================
      
      makePlane();
      makeLeaf();
      makeBranch()
      makeSphere();
      makeGroundGrid();
      makeCylinder();
      makeTorus();
      makeAxes();
      makeWings();
      makeApple();

      

      var V = (bdyVerts.length + lfVerts.length + bhVerts.length + gndVerts.length + cylVerts.length + 
        	   torVerts.length + sphVerts.length + axVerts.length + wgVerts.length + apVerts.length);

      var nn = V / floatsPerVertex;
      var colorShapes = new Float32Array(V);

      bdyStart = 0;
      for(i=0,j=0; j< bdyVerts.length; i++, j++) {
        colorShapes[i] = bdyVerts[j];
        }

      lfStart = i;
      for(j=0;j<lfVerts.length; i++, j++){
        colorShapes[i]=lfVerts[j];
      }

      bhStart = i;
      for(j=0;j<bhVerts.length; i++, j++){
        colorShapes[i]=bhVerts[j];
      }
      
        gndStart=i;
      for(j=0;j<gndVerts.length; i++, j++){
        colorShapes[i]=gndVerts[j];
      }
        cylStart=i; /////
      for(j=0;j<cylVerts.length;i++,j++){
        colorShapes[i]=cylVerts[j];
      }
        torStart=i;
      for(j=0;j<torVerts.length;i++,j++){
        colorShapes[i]=torVerts[j];
      }
        axStart=i;
      for(j=0;j<axVerts.length;i++,j++){
        colorShapes[i]=axVerts[j];
      }
     
        sphStart=i;
      for(j=0;j<sphVerts.length;i++,j++){
        colorShapes[i]=sphVerts[j];
      }
      
      	wgStart=i;
      for(j=0;j<wgVerts.length;i++,j++){
        colorShapes[i]=wgVerts[j];
      }

      apStart=i;
      for(j=0;j<apVerts.length;i++,j++){
        colorShapes[i]=apVerts[j];
      }

      
      // Create a buffer object
      var vertexColorbuffer = gl.createBuffer();  
      if (!vertexColorbuffer) {
        console.log('Failed to create the buffer object');
        return -1;
      }

      var shapeBufferHandle = gl.createBuffer();  
      if (!shapeBufferHandle) {
        console.log('Failed to create the shape buffer object');
        return false;
      }

      // Bind the the buffer object to target:
      gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
      // Transfer data from Javascript array colorShapes to Graphics system VBO
      // (Use sparingly--may be slow if you transfer large shapes stored in files)
      gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

      var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
        
      //Get graphics system's handle for our Vertex Shader's position-input variable: 
      var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
      if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
      }
      // Use handle to specify how to retrieve position data from our VBO:
      gl.vertexAttribPointer(
          a_Position,   // choose Vertex Shader attribute to fill with data
          4,            // how many values? 1,2,3 or 4.  (we're using x,y,z,w)
          gl.FLOAT,     // data type for each value: usually gl.FLOAT
          false,        // did we supply fixed-point data AND it needs normalizing?
          FSIZE * floatsPerVertex,    // Stride -- how many bytes used to store each vertex?
                        // (x,y,z,w, r,g,b) * bytes/value
          0);           // Offset -- now many bytes from START of buffer to the
                        // value we will actually use?
      gl.enableVertexAttribArray(a_Position);  
                        // Enable assignment of vertex buffer object's position data

      // Get graphics system's handle for our Vertex Shader's color-input variable;
      var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
      if(a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
      }
      // Use handle to specify how to retrieve color data from our VBO:
      gl.vertexAttribPointer(
        a_Color,        // choose Vertex Shader attribute to fill with data
        3,              // how many values? 1,2,3 or 4. (we're using R,G,B)
        gl.FLOAT,       // data type for each value: usually gl.FLOAT
        false,          // did we supply fixed-point data AND it needs normalizing?
        FSIZE * floatsPerVertex,      // Stride -- how many bytes used to store each vertex?
                        // (x,y,z,w, r,g,b) * bytes/value
        FSIZE * 4);     // Offset -- how many bytes from START of buffer to the
                        // value we will actually use?  Need to skip over x,y,z,w
                        
      gl.enableVertexAttribArray(a_Color);  
                        // Enable assignment of vertex buffer object's position data
     var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
      if(a_Normal < 0)
      {
        console.log('Failed to get the storage location of a_Normal');
        return -1;
      }
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 7);
      gl.enableVertexAttribArray(a_Normal);
      //--------------------------------DONE!
      // Unbind the buffer object 
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      return nn;
    }


    function keydown(ev, gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas) {
    //------------------------------------------------------
    //HTML calls this'Event handler' or 'callback function' when we press a key:
    switch(ev.keyCode){
        case 39: // right
        {
            up = new Vector3();
            up[0] = 0;
            up[1] = 1;
            up[2] = 0;
            look = new Vector3();
            look = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookAtX, g_LookAtY, g_LookAtZ);

            tmpVec3 = new Vector3();
            tmpVec3 = vec3CrossProduct(up, look);

            g_EyeX -= MOVE_STEP * tmpVec3[0];
            g_EyeY -= MOVE_STEP * tmpVec3[1];
            g_EyeZ -= MOVE_STEP * tmpVec3[2];

            g_LookAtX -= MOVE_STEP * tmpVec3[0];
            g_LookAtY -= MOVE_STEP * tmpVec3[1];
            g_LookAtZ -= MOVE_STEP * tmpVec3[2];

            break;
        }
        case 37:  // left
          { 
            up = new Vector3();
            up[0] = 0;
            up[1] = 1;
            up[2] = 0;
            look = new Vector3();
            look = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookAtX, g_LookAtY, g_LookAtZ);

            tmpVec3 = new Vector3();
            tmpVec3 = vec3CrossProduct(up, look);

            g_EyeX += MOVE_STEP * tmpVec3[0];
            g_EyeY += MOVE_STEP * tmpVec3[1];
            g_EyeZ += MOVE_STEP * tmpVec3[2];

            g_LookAtX += MOVE_STEP * tmpVec3[0];
            g_LookAtY += MOVE_STEP * tmpVec3[1];
            g_LookAtZ += MOVE_STEP * tmpVec3[2];

            break;
      
        } 
        case 38: // forward
           { 
            tmpVec3 = new Vector3();
            tmpVec3 = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookAtX, g_LookAtY, g_LookAtZ);
            
            g_EyeX += MOVE_STEP * tmpVec3[0];
            g_EyeY += MOVE_STEP * tmpVec3[1];
            g_EyeZ += MOVE_STEP * tmpVec3[2];

            g_LookAtX += MOVE_STEP * tmpVec3[0];
            g_LookAtY += MOVE_STEP * tmpVec3[1];
            g_LookAtZ += MOVE_STEP * tmpVec3[2];

            break;

        } 
        case 40: // backward
        { 
            tmpVec3 = new Vector3();
            tmpVec3 = vec3FromEye2LookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookAtX, g_LookAtY, g_LookAtZ);
            
            g_EyeX -= MOVE_STEP * tmpVec3[0];
            g_EyeY -= MOVE_STEP * tmpVec3[1];
            g_EyeZ -= MOVE_STEP * tmpVec3[2];

            g_LookAtX -= MOVE_STEP * tmpVec3[0];
            g_LookAtY -= MOVE_STEP * tmpVec3[1];
            g_LookAtZ -= MOVE_STEP * tmpVec3[2];

            break;
        } 

        case 65: // stafe left
        {
          if(LAST_UPDATE==-1 || LAST_UPDATE==0)
            {
              a = g_LookAtX - g_EyeX;
              b = g_LookAtY - g_EyeY;
              c = g_LookAtZ - g_EyeZ;
              l = Math.sqrt(a*a + b*b + c*c);
              
              lzx = Math.sqrt(a*a+c*c);
              sin_phi = lzx / l;

              theta0 = Math.PI -  Math.asin(a/lzx);

              THETA_NOW = theta0 + LOOK_STEP;
              
              LAST_UPDATE = 1;
            }
            else
            {
              THETA_NOW += LOOK_STEP;
            }

            g_LookAtY = b + g_EyeY;
            g_LookAtX = l * sin_phi * Math.sin(THETA_NOW) + g_EyeX;
            g_LookAtZ = l * sin_phi * Math.cos(THETA_NOW) + g_EyeZ;
            break;
        }
        case 68:  // strafe right
        {
            if (LAST_UPDATE==-1 || LAST_UPDATE==0)
            {
              a = g_LookAtX - g_EyeX;
              b = g_LookAtY - g_EyeY;
              c = g_LookAtZ - g_EyeZ;
              l = Math.sqrt(a*a + b*b + c*c);
              lzx = Math.sqrt(a*a+c*c);
              sin_phi = lzx / l;

              theta0 = Math.PI -  Math.asin(a/lzx);

              THETA_NOW = theta0 - LOOK_STEP;
              
              LAST_UPDATE = 1;
            }
            else
            {
              THETA_NOW -= LOOK_STEP;
            }

            g_LookAtY = b + g_EyeY;
            g_LookAtX = l * sin_phi * Math.sin(THETA_NOW) + g_EyeX;
            g_LookAtZ = l * sin_phi * Math.cos(THETA_NOW) + g_EyeZ;
            break;
          }
        case 87: // up
        {
            if (LAST_UPDATE==-1 || LAST_UPDATE==1)
            {  
              a = g_LookAtX - g_EyeX;
              b = g_LookAtY - g_EyeY;
              c = g_LookAtZ - g_EyeZ;
              l = Math.sqrt(a*a + b*b + c*c);
              cos_theta = c / Math.sqrt(a*a + c*c);
              sin_theta = a / Math.sqrt(a*a + c*c);

              phi0 = Math.asin(b/l);

              PHI_NOW = phi0 + LOOK_STEP;
              LAST_UPDATE = 0;
            }
            else
            {
              PHI_NOW += LOOK_STEP;
            }

            g_LookAtY = l * Math.sin(PHI_NOW) + g_EyeY;
            g_LookAtX = l * Math.cos(PHI_NOW) * sin_theta + g_EyeX;
            g_LookAtZ = l * Math.cos(PHI_NOW) * cos_theta + g_EyeZ;
            break;
          }
          case 83: // down
          {
            if(LAST_UPDATE==-1 || LAST_UPDATE==1)
            { 
              a = g_LookAtX - g_EyeX;
              b = g_LookAtY - g_EyeY;
              c = g_LookAtZ - g_EyeZ;
              l = Math.sqrt(a*a + b*b + c*c);
      
              cos_theta = c / Math.sqrt(a*a + c*c);
              sin_theta = a / Math.sqrt(a*a + c*c);

              phi0 = Math.asin(b/l);

              PHI_NOW = phi0 - LOOK_STEP;
              
              
              LAST_UPDATE = 0;
            }
            else
            {
              PHI_NOW -= LOOK_STEP;
            }

            g_LookAtY = l * Math.sin(PHI_NOW) + g_EyeY;
            g_LookAtX = l * Math.cos(PHI_NOW) * sin_theta + g_EyeX;
            g_LookAtZ = l * Math.cos(PHI_NOW) * cos_theta + g_EyeZ;
            break;
          }
          
          case 89: { // flying-plane
            tempEyeX += 1;
            break;
      
        } 
      
          
        default: {return;
        break;}
    }    
}

    function vec3FromEye2LookAt(eyeX, eyeY, eyeZ, lookAtX, lookAtY, lookAtZ)
    {
      result = new Vector3();
      
      dx = lookAtX - eyeX;
      dy = lookAtY - eyeY;
      dz = lookAtZ - eyeZ;
      amp = Math.sqrt(dx*dx + dy*dy + dz*dz);

      result[0] = dx/amp;
      result[1] = dy/amp;
      result[2] = dz/amp;

      return result;
    }

    function vec3CrossProduct(up, look)
    {
      r = new Vector3();

      r[0] = up[1]*look[2] - up[2]*look[1];
      r[1] = up[2]*look[0] - up[0]*look[2];
      r[2] = up[0]*look[1] - up[1]*look[0];

      amp = Math.sqrt(r[0]*r[0] + r[1]*r[1] + r[2]*r[2]) + 0.000001;

      r[0] /= amp;
      r[1] /= amp;
      r[2] /= amp;

      return r;
    }

    var g_EyeX = 0.2, g_EyeY = 0.25, g_EyeZ = 5.25;

    var g_LookAtX = 0.0, g_LookAtY = 0.0, g_LookAtZ = 0.0;

    var orthoLR = 0.5, orthoTB = 1, tempX = 0, tempY = 0, tempZ = 0;

    var tempEyeX = 0, tempEyeY = 0, tempEyeZ = 0;


    function draw(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas) {
    //==============================================================================
      
      // persp. camera

      // Clear <canvas> color AND DEPTH buffer
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.viewport(0, 0, canvas.width/2, canvas.height);
      projMatrix.setPerspective(35, (0.5*canvas.width)/canvas.height, 1, 100);
      
      viewMatrix.setLookAt(g_EyeX+currentAngle*tempEyeX*0.02, g_EyeY-currentAngle*tempEyeY*0.005, g_EyeZ-currentAngle*tempEyeZ*0.1, // eye position
                          g_LookAtX-currentAngle*tempX*0.06, g_LookAtY-currentAngle*tempY*0.02, g_LookAtZ+currentAngle*tempZ*0.3,                  // look-at point 
                          0, 1, 0);  
      
    drawall(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);
    
    // orthor. camera

    gl.viewport(canvas.width/2, 0, canvas.width/2, canvas.height);
    projMatrix.setOrtho(-2, 2, -2, 2, 1, 100);       // near, far; (always >=0)

    viewMatrix.setLookAt(0, 2, 10,
                          0, 0, 0, 
                          0, 1,0);

    drawall(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle,canvas);
      
      
    }



    function drawall(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas) {



      modelMatrix.setScale(0.7, 0.7, -0.7);
      modelMatrix.rotate(currentAngle*0.5, 0, 1, 0);
      modelMatrix.translate(0,0,5+currentAngle*0.03);

      modelMatrix.translate(0,1.0,-4);
      
      pushMatrix(modelMatrix);

      modelMatrix = popMatrix();
      pushMatrix(modelMatrix);



      drawApple(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);
     
      drawLeaf(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);

      drawPlane(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);

      drawTree(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);

      drawAnimal(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);


      drawGrid(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);


      drawAxes(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas);


      modelMatrix = popMatrix();
      return modelMatrix;

    }

    
    function makePlane() {
      bdyVerts = new Float32Array([

  
0.0, 0.0, -2.0, 1.0,       0.0, 1.0, 0.0,    0, 0, 1,//posn0
-1.0, 1.0, 0.0, 1.0,       1.0, 0.0, 0.0,     0, 0, 1,//posn1
1.0, 1.0, 0.0, 1.0,        0.0, 0.0, 1.0,     0, 0, 1,//posn4
1.0, -1.0, 0.0, 1.0,       1.0, 1.0, 0.0,   0, 0, 1,//posn3
0.0, 0.0, -2.0, 1.0,       0.0, 1.0, 1.0,    0, 0, 1,//posn0
-1.0, -1.0, 0.0, 1.0,     1.0, 0.0, 1.0,    0, 0, 1,//posn2
-1.0, 1.0, 0.0, 1.0,        1.0, 0.0, 0.0,     0, 0, 1,//posn1
1.0, -1.0, 0.0, 1.0,        1.0, 1.0, 0.0,   0, 0, 1,//posn3

1.0, 1.0, 0.0, 1.0,       1.0, 0.0, 1.0,     0, 0, 1,//posn4
1.0, 1.0, 5.0, 1.0,       0.0, 1.0, 0.0,     0, 0, 1,//posn5
-1.0, 1.0, 5.0, 1.0,      1.0, 0.0, 0.0,     0, 0, 1,//posn6
1.0, -1.0, 5.0, 1.0,     0.0, 0.0, 1.0,     0, 0, 1,//posn7
-1.0, -1.0, 5.0, 1.0,     1.0, 1.0, 0.0,     0, 0, 1,//posn8
-1.0, -1.0, 0.0, 1.0,    1.0, 0.0, 1.0,    0, 0, 1,//posn2
-1.0, 1.0, 5.0, 1.0,     0.0, 1.0, 1.0,     0, 0, 1,//posn6
-1.0, 1.0, 0.0, 1.0,     1.0, 0.0, 0.0,     0, 0, 1,//posn1
1.0, 1.0, 0.0, 1.0,       0.0, 0.0, 1.0,     0, 0, 1,//posn4
1.0, 1.0, 5.0, 1.0,       0.0, 1.0, 0.0,     0, 0, 1,//posn5
1.0, -1.0, 5.0, 1.0,      1.0, 0.0, 1.0,     0, 0, 1,//posn7
1.0, -1.0, 0.0, 1.0,      1.0, 1.0, 0.0,   0, 0, 1,//posn3


-1.0, -1.0, 5.0, 1.0,      0.0, 1.0, 0.0,     0, 0, 1,//posn8
1.0, -1.0, 5.0, 1.0,     1.0, 0.0, 0.0,     0, 0, 1,//posn7
2.0, -2.0, 7.0, 1.0,     0.0, 0.0, 1.0,     0, 0, 1,//posn9
2.0, 2.0, 7.0, 1.0,     1.0, 1.0, 0.0,     0, 0, 1,//posn10
-2.0, 2.0, 7.0, 1.0,     1.0, 0.0, 1.0,     0, 0, 1,//posn11
1.0, 1.0, 5.0, 1.0,      0.0, 1.0, 1.0,     0, 0, 1,//posn5
-1.0, 1.0, 5.0, 1.0,     1.0, 1.0, 0.0,     0, 0, 1,//posn6
-1.0, -1.0, 5.0, 1.0,     1.0, 0.0, 1.0,     0, 0, 1,//posn8
-2.0, -2.0, 7.0, 1.0,      0.0, 1.0, 0.0,     0, 0, 1,//posn12
2.0, -2.0, 7.0, 1.0,      1.0, 1.0, 0.0,     0, 0, 1,//posn9
2.0, 2.0, 7.0, 1.0,     0.0, 0.0, 1.0,     0, 0, 1,//posn10
1.0, -1.0, 5.0, 1.0,     0.0, 1.0, 1.0,     0, 0, 1,//posn7
1.0, 1.0, 5.0, 1.0,      1.0, 1.0, 0.0,     0, 0, 1,//posn5
-1.0, 1.0, 5.0, 1.0,     1.0, 0.0, 1.0,     0, 0, 1,//posn6
-1.0, -1.0, 5.0, 1.0,      0.0, 0.0, 1.0,     0, 0, 1,//posn8
-2.0, 2.0, 7.0, 1.0,     1.0, 0.0, 0.0,     0, 0, 1,//posn11
-2.0, -2.0, 7.0, 1.0,      0.0, 1.0, 0.0,     0, 0, 1,//posn12

        ]);
    }


 
    function makeLeaf() {
       lfVerts = new Float32Array([
        
    0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.0, 			0, 0, 1, //posn0
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0, //posn1
   	0.0, -0.1, 0.2, 1.0,		0.0, 0.5, 0.0, 			0, 0, 1.0, //posn2

   	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.0, 			0, 0, 1.0,//posn0
   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 0.0, 			0, 0, 1.0,//posn2
   	0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0,//posn3


   	0.0, -0.1, 0.2, 1.0, 		0.0, 1.0, 0.0, 			0, 0, 1.0,//posn2
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0,//posn1
   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 0.0, 			0, 0, 1.0,//posn3



	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.0, 			0, 0, 1.0, //posn0
   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0, //posn1
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.5, 0.0, 			0, 0, 1.0, //posn4

	0.0, 0.0, 0.0, 1.0,			0.0, 1.0, 0.0, 			0, 0, 1.0, //posn0
   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 0.0, 			0, 0, 1.0,//posn3
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0, //posn4


   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0, //posn1
   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 0.0, 			0, 0, 1.0,//posn2
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.0, 			0, 0, 1.0,//posn5

   	0.0, -0.1, 0.2, 1.0, 		0.0, 0.5, 0.0, 			0, 0, 1.0,//posn2
   	0.2, -0.2, 0.0, 1.0, 		0.0, 1.0, 0.0, 			0, 0, 1.0,//posn3
   	0.0, -0.4, 0.0, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0,//posn5


   	0.2, -0.2, 0.0, 1.0, 		0.0, 0.5, 0.0, 			0, 0, 1.0,//posn3
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0, //posn4
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.0, 			0, 0, 1.0,//posn5

   -0.2, -0.2, 0.0, 1.0,		0.0, 0.8, 0.0, 			0, 0, 1.0, //posn1
   	0.0, -0.1, -0.2, 1.0,		0.0, 0.5, 0.0, 			0, 0, 1.0, //posn4
   	0.0, -0.4, 0.0, 1.0,		0.0, 1.0, 0.0, 			0, 0, 1.0,//posn5

        ]);
    }


function makeBranch() {
       bhVerts = new Float32Array([
        

  0.0,   0.0,  2.0,  1.0,           0.0,  0.5,  0.5,    0,1,0, /////posn13
   -2.5,  0.0, -2.0,  1.0,           0.2,  0.3,  0.6,    0,1,0,
    0.0,   0.0, -2.0,  1.0,           1.0,  1.0,  0.0,    0,1,0,
   -2.5, 0.0,  2.0,  1.0,           0.0,  0.5,  0.5,   0,1,0, /////posn12
    0.0,  0.0,  2.0,  1.0,           0.2,  0.3,  0.6,   0,1,0, /////posn13
   -2.5, 0.0, -2.0,  1.0,           1.0,  1.0,  0.0,   0,1,0, /////posn14

-2.0,  1.0,  1.0,  1.0,           0.0,  0.5,  0.5,    0,1,0,  /////posn6
-2.5, 0.0,  2.0,  1.0,           0.2,  0.3,  0.6,    0,1,0,  /////posn12
 0.0,  0.0,  2.0,  1.0,           1.0,  1.0,  0.0,    0,1,0, /////posn13
-0.5,  1.0,  1.0,  1.0,           0.0,  0.5,  0.5,   0,1,0,/////posn7
-2.0,   1.0,  1.0,  1.0,           0.2,  0.3,  0.6,   0,1,0, /////posn6
 0.0,   0.0,  2.0,  1.0,           1.0,  1.0,  0.0,   0,1,0, /////posn13


-2.0,  1.0, -1.0,  1.0,           0.0,  0.5,  0.5,    0,1,0, /////posn8
-2.5, 0.0, -2.0,  1.0,           0.2,  0.3,  0.6,    0,1,0, /////posn14
 0.0,  0.0, -2.0,  1.0,           1.0,  1.0,  0.0,    0,1,0, /////posn15
-0.5,  1.0, -1.0,  1.0,           0.0,  0.5,  0.5,   0,1,0, /////posn9
-2.0,   1.0, -1.0,  1.0,           0.2,  0.3,  0.6,   0,1,0, /////posn8
 0.0,   0.0, -2.0,  1.0,           1.0,  1.0,  0.0,   0,1,0, /////posn15


   -2.5, 0.0, -2.0,  1.0,           1.0,  1.0,  0.0,   0,1,0, /////posn14
   -2.5, 0.0,  2.0,  1.0,           1.0,  1.0,  0.0,   0,1,0, /////posn12
   -2.0,  1.0,  1.0,  1.0,           1.0,  1.0,  0.0,     0,1,0, /////posn6
     -2.0,  1.0, -1.0,  1.0,           1.0,  1.0,  0.0,   0,1,0, /////posn8
   -2.0,  1.0,  1.0,  1.0,           1.0,  1.0,  0.0,   0,1,0, /////posn6
   -2.5, 0.0, -2.0,  1.0,           1.0,  1.0,  0.0,   0,1,0, /////posn14


   -0.5,  1.0,  1.0,  1.0,           1.0,  1.0,  0.0,  0,1,0, /////posn7
   -0.5,  1.0, -1.0,  1.0,           1.0,  1.0,  0.0,    0,1,0, /////posn9
    0.0,   0.0,  2.0,  1.0,           1.0,  1.0,  0.0,    0,1,0, /////posn13
     -0.5,  1.0, -1.0,  1.0,           1.0,  1.0,  0.0,      0,1,0, /////posn9
    0.0,   0.0,  2.0,  1.0,           1.0,  1.0,  0.0,    0,1,0, /////posn13
    0.0,   0.0, -2.0,  1.0,           1.0,  1.0,  0.0,    0,1,0, /////posn15


 ]);
    }

    function makeSphere() {
    //==============================================================================
    // Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
    // equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
    // and connect them as a 'stepped spiral' design (see makeCylinder) to build the
    // sphere from one triangle strip.
      var slices = 40;    // # of slices of the sphere along the z axis. >=3 req'd
                          // (choose odd # or prime# to avoid accidental symmetry)
      var sliceVerts  = 27; // # of vertices around the top edge of the slice
                          // (same number of vertices on bottom of slice, too)
      var topColr = new Float32Array([0.0, 0.0, 0.0]);  // North Pole: light gray
      var equColr = new Float32Array([0.2, 0.2, 0.2]);  // Equator:    bright green
      var botColr = new Float32Array([0.1, 0.1, 0.1]);  // South Pole: brightest gray.
      var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

      // Create a (global) array to hold this sphere's vertices:
      sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                        // # of vertices * # of elements needed to store them. 
                        // each slice requires 2*sliceVerts vertices except 1st and
                        // last ones, which require only 2*sliceVerts-1.
                        
      // Create dome-shaped top slice of sphere at z=+1
      // s counts slices; v counts vertices; 
      // j counts array elements (vertices * elements per vertex)
      var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
      var sin0 = 0.0;
      var cos1 = 0.0;
      var sin1 = 0.0; 
      var j = 0;              // initialize our array index
      var isLast = 0;
      var isFirst = 1;
      for(s=0; s<slices; s++) { // for each slice of the sphere,
        // find sines & cosines for top and bottom of this slice
        if(s==0) {
          isFirst = 1;  // skip 1st vertex of 1st slice.
          cos0 = 1.0;   // initialize: start at north pole.
          sin0 = 0.0;
        }
        else {          // otherwise, new top edge == old bottom edge
          isFirst = 0;  
          cos0 = cos1;
          sin0 = sin1;
        }               // & compute sine,cosine for new bottom edge.
        cos1 = Math.cos((s+1)*sliceAngle);
        sin1 = Math.sin((s+1)*sliceAngle);
        // go around the entire slice, generating TRIANGLE_STRIP verts
        // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
        if(s==slices-1) isLast=1; // skip last vertex of last slice.
        for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
          if(v%2==0)
          {       // put even# vertices at the the slice's top edge
                  // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
                  // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
            sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
            sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
            sphVerts[j+2] = cos0;   
            sphVerts[j+3] = 1.0;      
          }
          else {  // put odd# vertices around the slice's lower edge;
                  // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                  //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
            sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
            sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
            sphVerts[j+2] = cos1;                                       // z
            sphVerts[j+3] = 1.0;                                        // w.   
          }
          if(s==0) {  // finally, set some interesting colors for vertices:
            sphVerts[j+4]=topColr[0]; 
            sphVerts[j+5]=topColr[1]; 
            sphVerts[j+6]=topColr[2];
            sphVerts[j+7]=1;
            sphVerts[j+8]=0;
            sphVerts[j+9]=0; 
            }
          else if(s==slices-1) {
            sphVerts[j+4]=botColr[0]; 
            sphVerts[j+5]=botColr[1]; 
            sphVerts[j+6]=botColr[2];
            sphVerts[j+7]=1;
            sphVerts[j+8]=0;
            sphVerts[j+9]=0; 
          }
          else {
              sphVerts[j+4]=0.0;// equColr[0]; 
              sphVerts[j+5]=Math.random();// equColr[1]; 
              sphVerts[j+6]=Math.random();// equColr[2];
              sphVerts[j+7]=1;
              sphVerts[j+8]=0;
              sphVerts[j+9]=0;          
          }
        }
      }
    }

    function makeCylinder() {
    //==============================================================================
    // Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
    // 'stepped spiral' design described in notes.
    // Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
    //
     var ctrColr = new Float32Array([0.35, 0.16, 0.14]); // dark gray
     var topColr = new Float32Array([0.36, 0.25, 0.2]); // light green
     var botColr = new Float32Array([0.91, 0.76, 0.65]); // light blue
     var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
     var botRadius = 1.6;   // radius of bottom of cylinder (top always 1.0)
     
     // Create a (global) array to hold this cylinder's vertices;
     cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                        // # of vertices * # of elements needed to store them. 

      // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
      // v counts vertices: j counts array elements (vertices * elements per vertex)
      for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
        // skip the first vertex--not needed.
        if(v%2==0)
        {       // put even# vertices at center of cylinder's top cap:
          cylVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
          cylVerts[j+1] = 0.0;  
          cylVerts[j+2] = 1.0; 
          cylVerts[j+3] = 1.0;      // r,g,b = topColr[]
          cylVerts[j+4]=ctrColr[0]; 
          cylVerts[j+5]=ctrColr[1]; 
          cylVerts[j+6]=ctrColr[2];
          cylVerts[j+7] = 0;  //dx
          cylVerts[j+8] = 0;  //dy
          cylVerts[j+9] = 1;  //dz
        }
        else {  // put odd# vertices around the top cap's outer edge;
                // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
          cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
          cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
          //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
          //   can simplify cos(2*PI * (v-1)/(2*capVerts))
          cylVerts[j+2] = 1.0;  // z
          cylVerts[j+3] = 1.0;  // w.
          // r,g,b = topColr[]
          cylVerts[j+4]=topColr[0]; 
          cylVerts[j+5]=topColr[1]; 
          cylVerts[j+6]=topColr[2];
          cylVerts[j+7] = 0;  //dx
          cylVerts[j+8] = 0;  //dy
          cylVerts[j+9] = 1;  //dz     
        }
      }
      // Create the cylinder side walls, made of 2*capVerts vertices.
      // v counts vertices within the wall; j continues to count array elements
      for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
        if(v%2==0)  // position all even# vertices along top cap:
        {   
            cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
            cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
            cylVerts[j+2] = 1.0;  // z
            cylVerts[j+3] = 1.0;  // w.
            // r,g,b = topColr[]
            cylVerts[j+4]=topColr[0]; 
            cylVerts[j+5]=topColr[1]; 
            cylVerts[j+6]=topColr[2];  
            cylVerts[j+7] = Math.cos(Math.PI*(v)/capVerts); //dx
          cylVerts[j+8] = Math.sin(Math.PI*(v)/capVerts); //dy
          cylVerts[j+9] = 0;   
        }
        else    // position all odd# vertices along the bottom cap:
        {
            cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
            cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
            cylVerts[j+2] =-1.0;  // z
            cylVerts[j+3] = 1.0;  // w.
            // r,g,b = topColr[]
            cylVerts[j+4]=botColr[0] ;//+ currentAngle; 
            cylVerts[j+5]=botColr[1]; 
            cylVerts[j+6]=botColr[2];  
            cylVerts[j+7] = Math.cos(Math.PI*(v-1)/capVerts); //dx
          cylVerts[j+8] = Math.sin(Math.PI*(v-1)/capVerts); //dy
          cylVerts[j+9] = 0;   
        }
      }
      // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
      // v counts the vertices in the cap; j continues to count array elements
      for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
        if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
          cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
          cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
          cylVerts[j+2] =-1.0;  // z
          cylVerts[j+3] = 1.0;  // w.
          // r,g,b = topColr[]
          cylVerts[j+4]=botColr[0]; 
          cylVerts[j+5]=botColr[1]; 
          cylVerts[j+6]=botColr[2]; 
          cylVerts[j+7] = 0;
          cylVerts[j+8] = 0;
          cylVerts[j+9] = -1;   
        }
        else {        // position odd#'d vertices at center of the bottom cap:
          cylVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
          cylVerts[j+1] = 0.0;  
          cylVerts[j+2] =-1.0; 
          cylVerts[j+3] = 1.0;      // r,g,b = botColr[]
          cylVerts[j+4]= topColr[0];//0.8 + currentAngle*0.01;; 
          cylVerts[j+5]= topColr[1];//Math.random()+currentAngle*0.005;; 
          cylVerts[j+6]= topColr[2];//Math.random()+currentAngle*0.01;;
          cylVerts[j+7] = 0;
          cylVerts[j+8] = 0;
          cylVerts[j+9] = -1;
        }

      }
    }

    function makeTorus() {
    var rbend = 1.0;                    // Radius of circle formed by torus' bent bar
    var rbar = 0.5;                     // radius of the bar we bent to form torus
    var barSlices = 23;                 // # of bar-segments in the torus: >=3 req'd;
                                        // more segments for more-circular torus
    var barSides = 13;                    // # of sides of the bar (and thus the 
                                        // number of vertices in its cross-section)
                                        // >=3 req'd;
                                        // more sides for more-circular cross-section
    // for nice-looking torus with approx square facets, 
    //      --choose odd or prime#  for barSides, and
    //      --choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
    // EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.

      // Create a (global) array to hold this torus's vertices:
     torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
    //  Each slice requires 2*barSides vertices, but 1st slice will skip its first 
    // triangle and last slice will skip its last triangle. To 'close' the torus,
    // repeat the first 2 vertices at the end of the triangle-strip.  Assume 7
    //tangent vector with respect to big circle
      var tx = 0.0;
      var ty = 0.0;
      var tz = 0.0;
      //tangent vector with respect to small circle
      var sx = 0.0;
      var sy = 0.0;
      var sz = 0.0;
    var phi=0, theta=0;                   // begin torus at angles 0,0
    var thetaStep = 2*Math.PI/barSlices;  // theta angle between each bar segment
    var phiHalfStep = Math.PI/barSides;   // half-phi angle between each side of bar
                                          // (WHY HALF? 2 vertices per step in phi)
      // s counts slices of the bar; v counts vertices within one slice; j counts
      // array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
      for(s=0,j=0; s<barSlices; s++) {    // for each 'slice' or 'ring' of the torus:
        for(v=0; v< 2*barSides; v++, j+=floatsPerVertex) {    // for each vertex in this slice:
          if(v%2==0)  { // even #'d vertices at bottom of slice,
            torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
                                                 Math.cos((s)*thetaStep);
                    //  x = (rbend + rbar*cos(phi)) * cos(theta)
            torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
                                                 Math.sin((s)*thetaStep);
                    //  y = (rbend + rbar*cos(phi)) * sin(theta) 
            torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
                    //  z = -rbar  *   sin(phi)
            torVerts[j+3] = 1.0;    // w
            //find normal
            tx = (-1) * Math.sin(s*thetaStep);
            ty = Math.cos(s*thetaStep);
            tz = 0.0;

            sx = Math.cos(s*thetaStep) * (-1) * Math.sin(v*phiHalfStep);
            sy = Math.sin(s*thetaStep) * (-1) * Math.sin(v*phiHalfStep);
            sz = (-1) * Math.cos(v*phiHalfStep);

            torVerts[j+7] = -ty*sz + tz*sy;
            torVerts[j+8] = -tz*sx + tx*sz;
            torVerts[j+9] = -tx*sy + ty*sx;
          }
          else {        // odd #'d vertices at top of slice (s+1);
                        // at same phi used at bottom of slice (v-1)
            torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
                                                 Math.cos((s+1)*thetaStep);
                    //  x = (rbend + rbar*cos(phi)) * cos(theta)
            torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
                                                 Math.sin((s+1)*thetaStep);
                    //  y = (rbend + rbar*cos(phi)) * sin(theta) 
            torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
                    //  z = -rbar  *   sin(phi)
            torVerts[j+3] = 1.0;    // w
            tx = (-1) * Math.sin((s+1)*thetaStep);
            ty = Math.cos((s+1)*thetaStep);
            tz = 0.0;

            sx = Math.cos((s+1)*thetaStep) * (-1) * Math.sin((v-1)*phiHalfStep);
            sy = Math.sin((s+1)*thetaStep) * (-1) * Math.sin((v-1)*phiHalfStep);
            sz = (-1) * Math.cos((v-1)*phiHalfStep);

            torVerts[j+7] = -ty*sz + tz*sy;
            torVerts[j+8] = -tz*sx + tx*sz;
            torVerts[j+9] = -tx*sy + ty*sx;
          }
          torVerts[j+4] = 0.0//Math.random() + 0.7;    // random color 0.0 <= R < 1.0
          torVerts[j+5] = 0.0//Math.random()+currentAngle*0.004;    // random color 0.0 <= G < 1.0
          torVerts[j+6] = 0.0//Math.random()+currentAngle*0.01;   // random color 0.0 <= B < 1.0
        }
      }
      // Repeat the 1st 2 vertices of the triangle strip to complete the torus:
          torVerts[j  ] = rbend + rbar; // copy vertex zero;
                  //  x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
          torVerts[j+1] = 0.0;
                  //  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
          torVerts[j+2] = 0.0;
                  //  z = -rbar  *   sin(phi==0)
          torVerts[j+3] = 1.0;    // w
          torVerts[j+4] = 0.0//Math.random();    // random color 0.0 <= R < 1.0
          torVerts[j+5] = 0.0//Math.random();    // random color 0.0 <= G < 1.0
          torVerts[j+6] = 0.0//Math.random();    // random color 0.0 <= B < 1.0
          j+=floatsPerVertex; // go to next vertex:
          torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
                  //  x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
          torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
                  //  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
          torVerts[j+2] = 0.0;
                  //  z = -rbar  *   sin(phi==0)
          torVerts[j+3] = 1.0;    // w
          torVerts[j+4] = 0.0//Math.random();    // random color 0.0 <= R < 1.0
          torVerts[j+5] = 0.0//Math.random();    // random color 0.0 <= G < 1.0
          torVerts[j+6] = 0.0//Math.random();    // random color 0.0 <= B < 1.0
          torVerts[j+7] = 1.0;
          torVerts[j+8] = 0.0;
          torVerts[j+9] = 0.0;
    }

    function makeAxes(){
       axVerts = new Float32Array([
         0,0,0,1,     1.0,1.0,1.0, 		0,1,0,
         1,0,0,1,     1.0, 0.0,0.0,  	0,1,0,

         0,0,0,1,     1.0,1.0,1.0,  	0,0,1,
         0,1,0,1,     0.0,1.0, 0.0,  	0,0,1,

         0,0,0,1,     1.0,1.0,1.0,  	1,0,0,
         0,0,1,1,     0.0,0.0,1.0,  	1,0,0,
        ]);
    }

   

    function makeWings() {
    	wgVerts = new Float32Array([
		// front
		0.1,    1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  	0, 0, 1.0, ///// posn0
		0.2,    0.6, 0.05,  1.0,           0.0,  0.8,  0.0,  	0, 0, 1.0, ///// posn1
	    0.05,   0.6, 0.05,  1.0,           0.0,  1.0,  0.0,  	0, 0, 1.0, ///// posn2

	    // back
		0.1,   1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  		0, 0, 1.0, ///// posn0
		0.2,   0.6, -0.1,  1.0,           0.0,  0.8,  0.0,  	0, 0, 1.0, ///// posn3
	    0.05,  0.6, -0.1,  1.0,           0.0,  1.0,  0.0,  	0, 0, 1.0, ///// posn4

	    // left
		0.1,   1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  		0, 0, 1.0, ///// posn0
	    0.05,  0.6, -0.1,  1.0,           0.0, 0.8,  0.0,  		0, 0, 1.0, ///// posn4
	    0.05,  0.6,  0.05,  1.0,          0.0, 1.0,  0.0,  		0, 0, 1.0, ///// posn2

	    // right
		0.1,  1.0, 0.0,  1.0,           0.0,  0.5,  0.0,  	0, 0, 1.0, ///// posn0
		0.2,  0.6, -0.1,  1.0,          0.0,  0.8,  0.0,  	0, 0, 1.0, ///// posn3
		0.2,  0.6,  0.05,  1.0,         0.0,  1.0,  0.0,  	0, 0, 1.0, /////posn1


    		]);


    }

    function makeApple() {

      //==============================================================================
    // Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
    // equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
    // and connect them as a 'stepped spiral' design (see makeCylinder) to build the
    // sphere from one triangle strip.
      var slices = 40;    // # of slices of the sphere along the z axis. >=3 req'd
                          // (choose odd # or prime# to avoid accidental symmetry)
      var sliceVerts  = 27; // # of vertices around the top edge of the slice
                          // (same number of vertices on bottom of slice, too)
      var topColr = new Float32Array([1.0, 0.0, 0.0]);  // North Pole: light gray
      var equColr = new Float32Array([0.5, 0.0, 0.0]);  // Equator:    bright green
      var botColr = new Float32Array([0.2, 0.0, 0.0]);  // South Pole: brightest gray.
      var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

      // Create a (global) array to hold this sphere's vertices:
      apVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                        // # of vertices * # of elements needed to store them. 
                        // each slice requires 2*sliceVerts vertices except 1st and
                        // last ones, which require only 2*sliceVerts-1.
                        
      // Create dome-shaped top slice of sphere at z=+1
      // s counts slices; v counts vertices; 
      // j counts array elements (vertices * elements per vertex)
      var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
      var sin0 = 0.0;
      var cos1 = 0.0;
      var sin1 = 0.0; 
      var j = 0;              // initialize our array index
      var isLast = 0;
      var isFirst = 1;
      for(s=0; s<slices; s++) { // for each slice of the sphere,
        // find sines & cosines for top and bottom of this slice
        if(s==0) {
          isFirst = 1;  // skip 1st vertex of 1st slice.
          cos0 = 1.0;   // initialize: start at north pole.
          sin0 = 0.0;
        }
        else {          // otherwise, new top edge == old bottom edge
          isFirst = 0;  
          cos0 = cos1;
          sin0 = sin1;
        }               // & compute sine,cosine for new bottom edge.
        cos1 = Math.cos((s+1)*sliceAngle);
        sin1 = Math.sin((s+1)*sliceAngle);
        // go around the entire slice, generating TRIANGLE_STRIP verts
        // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
        if(s==slices-1) isLast=1; // skip last vertex of last slice.
        for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
          if(v%2==0)
          {       // put even# vertices at the the slice's top edge
                  // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
                  // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
            apVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
            apVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
            apVerts[j+2] = cos0;   
            apVerts[j+3] = 1.0;      
          }
          else {  // put odd# vertices around the slice's lower edge;
                  // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                  //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
            apVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
            apVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
            apVerts[j+2] = cos1;                                       // z
            apVerts[j+3] = 1.0;                                        // w.   
          }
          if(s==0) {  // finally, set some interesting colors for vertices:
            apVerts[j+4]=topColr[0]; 
            apVerts[j+5]=topColr[1]; 
            apVerts[j+6]=topColr[2];
            apVerts[j+7]=1;
            apVerts[j+8]=0;
            apVerts[j+9]=0; 
            }
          else if(s==slices-1) {
            apVerts[j+4]=botColr[0]; 
            apVerts[j+5]=botColr[1]; 
            apVerts[j+6]=botColr[2];
            apVerts[j+7]=1;
            apVerts[j+8]=0;
            apVerts[j+9]=0; 
          }
          else {
              apVerts[j+4]=1.0-s*0.02;// equColr[0]; 
              apVerts[j+5]=0.0;// equColr[1]; 
              apVerts[j+6]=Math.random();// equColr[2];
              apVerts[j+7]=1;
              apVerts[j+8]=0;
              apVerts[j+9]=0;          
          }
        }
      }


    }

function drawApple(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas){

	modelMatrix.setTranslate(1.0,-0.35,2.0);
      modelMatrix.rotate(90, 1,0,0)
      modelMatrix.rotate(
          // -90, 0, 1, 0);
          currentAngle*0.5, 0, 0, 1); // fixed

      // modelMatrix.rotate(currentAngle, 0, 1, 0);
      modelMatrix.scale(0.2, 0.2, 0.2);
      // modelMatrix.rotate(-90.0, 1,0,0);
      quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w); // Quaternion-->Matrix
      modelMatrix.concat(quatMatrix);   
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, apStart/floatsPerVertex,apVerts.length/floatsPerVertex);
}



function drawLeaf(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas) {
pushMatrix(modelMatrix);


      modelMatrix.translate(0, 0,-1);
      modelMatrix.rotate(currentAngle*0.2, 0, 0, 1);
    // if(i==0){
      modelMatrix.rotate(90, 0, 1, 0); // fixed
      modelMatrix.rotate(90, 1, 0, 0); // fixed

      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      
        modelMatrix.scale(2.0, 5.0, 2.0);
        // modelMatrix.scale(2.0, 2.0, 2.0);

      // }
      // modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);



      // leaf joint
      for(i=0; i<1; i++){

      modelMatrix.translate(0, -0.2, 0);
      modelMatrix.rotate(currentAngle, 0, 0, 1);
   
      modelMatrix.scale(0.7, 0.7, 0.7);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);


      }



// leaf2
      modelMatrix = popMatrix(); // back to apple
      pushMatrix(modelMatrix);


      modelMatrix.translate(1, 0,-1);
      modelMatrix.rotate(currentAngle*0.2, 0, 0, 1);
    // if(i==0){
      modelMatrix.rotate(90, 0, 1, 0); // fixed
      modelMatrix.rotate(90, 1, 0, 0); // fixed

      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      
        modelMatrix.scale(2.0, 5.0, 2.0);
        // modelMatrix.scale(2.0, 2.0, 2.0);

      // }
      // modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);



// leaf joint
      for(i=0; i<1; i++){

      modelMatrix.translate(0, 0.1, 0);
      modelMatrix.rotate(currentAngle*0.5, 0, 0, 1);
      
        modelMatrix.scale(0.7, 0.7, 0.7);
         mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);


      }
}


function drawPlane(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas){
// wheel

      modelMatrix = popMatrix(); // back to apple
      modelMatrix = popMatrix(); // back to original
      pushMatrix(modelMatrix);

      // modelMatrix.rotate(currentAngle*0.15, 0, 1, 0);
      modelMatrix.translate(-0.5, 0.35, 1.0);
      modelMatrix.scale(0.1,0.07,0.86);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, torStart/floatsPerVertex,torVerts.length/floatsPerVertex);

      modelMatrix.translate(10.3, 0, 0);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, torStart/floatsPerVertex,torVerts.length/floatsPerVertex);

 


      // plane

        modelMatrix = popMatrix();
      pushMatrix(modelMatrix);

      modelMatrix.rotate(0.15*currentAngle, 0, 1, 0);
      modelMatrix.rotate(90.0,0,0,1);
      modelMatrix.translate(0.6,-0.02,0);
      modelMatrix.scale(0.35,0.35,0.35);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
       gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, bdyStart/floatsPerVertex,bdyVerts.length/floatsPerVertex);


      // wings

      // modelMatrix.rotate(0.15*currentAngle, 0, 1, 0);
      // modelMatrix.rotate(90.0,0,0,1);
      modelMatrix.scale(5, 10, 10);
      modelMatrix.translate(-0.1,-0.5,0.2);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
       gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, wgStart/floatsPerVertex,wgVerts.length/floatsPerVertex);



	// wings2

      // modelMatrix.rotate(0.15*currentAngle, 0, 1, 0);
      modelMatrix.rotate(180.0,1,0,0);
      // modelMatrix.scale(5, 10, 10);
      modelMatrix.translate(0.0,-1.0,0.0);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
       gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, wgStart/floatsPerVertex,wgVerts.length/floatsPerVertex);


}


function drawTree(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas){

	//tree
      modelMatrix.setTranslate(1.0,-0.3,0.0);
      modelMatrix.scale(0.25,0.25,0.25);
      // modelMatrix.rotate(currentAngle*0.2, 0, 0, 1);
      modelMatrix.rotate(-90.0, 1,0,0);

      pushMatrix(modelMatrix);

      modelMatrix = popMatrix();
      pushMatrix(modelMatrix);
      // quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w); // Quaternion-->Matrix
      // modelMatrix.concat(quatMatrix);   
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);




      for(i = 0; i<10; i++){
     // tree2
      modelMatrix.translate(0, 0, 1.5);
      modelMatrix.rotate(currentAngle*0.1, 0, 1, 0);
      modelMatrix.scale(0.7, 0.7, 0.7);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);

	}




//leaf
      pushMatrix(modelMatrix);	// push new matrix for modifying



      popMatrix();	// because the next object is drawn on the original matrix, so just discard this new modified matrix



// pushMatrix(modelMatrix);

//leaf
// for(i=0; i<10; i++){
	  modelMatrix.translate(-0.5, 0, 6.5);
	  // modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
	  // if(i==0){
 	  	modelMatrix.rotate(90, 0, 1, 0); // fixed
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      
      	modelMatrix.scale(20.0, 20.0, 50.0);
      // }
      // modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);




	// branch_left
	modelMatrix = popMatrix();
      pushMatrix(modelMatrix); /////  disconnect

	modelMatrix.translate(-1, 0, 1.5);
      modelMatrix.rotate(-45, 0, 1, 0); // fixed
      modelMatrix.scale(0.25, 0.25, 0.25);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);


// branch_left2
for(i = 0; i<5; i++){

	  modelMatrix.translate(0, 0, 1.5);
      modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
      modelMatrix.scale(0.7, 0.7, 0.7);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);

}

//leaf
	  modelMatrix.translate(-0.5, 0, 6.5);
	  // modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
 	  modelMatrix.rotate(90, 0, 1, 0); // fixed
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      modelMatrix.scale(20.0, 20.0, 50.0);
      // modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);



// branch_right
	modelMatrix = popMatrix();
      pushMatrix(modelMatrix); /////  disconnect

	modelMatrix.translate(0.7, 0, 2.5);
      modelMatrix.rotate(50, 0, 1, 0); // fixed
      modelMatrix.scale(0.25, 0.25, 0.25);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);




// branch_right2
for(i = 0; i<5; i++){

	  modelMatrix.translate(0, 0, 1.5);
      modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
      modelMatrix.scale(0.7, 0.7, 0.7);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex,cylVerts.length/floatsPerVertex);

}

//leaf on right
//leaf
// for(i=0; i<10; i++){
    modelMatrix.translate(-0.5, 0, 6.5);
    // modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
    // if(i==0){
      modelMatrix.rotate(90, 0, 1, 0); // fixed
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      
        modelMatrix.scale(20.0, 20.0, 50.0);
      // }
      // modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);


      // leaf2
       modelMatrix.translate(0.15, 0, 0.0);
    // modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
    // if(i==0){
      // modelMatrix.rotate(90, 0, 1, 0); // fixed
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      
        // modelMatrix.scale(20.0, 20.0, 50.0);
      // }
      // modelMatrix.scale(1.5, 1.5, 1.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);



// leaf
	  modelMatrix = popMatrix();
      pushMatrix(modelMatrix); /////  disconnect

	  modelMatrix.translate(-1.5, 0, 1.5);
	  modelMatrix.rotate(45, 0, 1, 0); // fixed
      modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      modelMatrix.scale(2.0, 2.0, 5.0);
      modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);


// leaf2
	  modelMatrix = popMatrix();
      pushMatrix(modelMatrix); /////  disconnect

	  modelMatrix.translate(1.0, 0.0, 1.5);
	  modelMatrix.rotate(90, 0, 1, 0); // fixed
      modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      modelMatrix.scale(2.0, 2.0, 5.0);
      modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);

// leaf3
modelMatrix = popMatrix();
      pushMatrix(modelMatrix); /////  disconnect

    modelMatrix.translate(1.2, 0.0, 2.2);
    modelMatrix.rotate(-45, 0, 1, 0); // fixed
      modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      modelMatrix.scale(2.0, 2.0, 5.0);
      modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);


// leaf4
modelMatrix = popMatrix();
      pushMatrix(modelMatrix); /////  disconnect

    modelMatrix.translate(-0.8, 0.0, 3.0);
    modelMatrix.rotate(90, 0, 1, 0); // fixed
      modelMatrix.rotate(currentAngle*0.2, 0, 1, 0);
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      modelMatrix.scale(2.0, 2.0, 5.0);
      modelMatrix.scale(0.5, 0.5, 0.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      // gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);



}


function drawAnimal(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas){

      modelMatrix = popMatrix();
      pushMatrix(modelMatrix); // add new original matrix for modifying[disconnect with the previous push!!]


      //head
      modelMatrix.translate(-5.0,0.0,1);
      modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	currentAngle*0.5, 0, 0, 1); // fixed

      // modelMatrix.rotate(currentAngle, 0, 1, 0);
      modelMatrix.scale(1.5, 1.5, 1.85);
      // modelMatrix.rotate(-90.0, 1,0,0);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, sphStart/floatsPerVertex,sphVerts.length/floatsPerVertex);



      pushMatrix(modelMatrix);


       modelMatrix.scale(2,2,2);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                    axStart/floatsPerVertex, // start at this vertex number, and
                    axVerts.length/floatsPerVertex);

      
      modelMatrix = popMatrix();
// modelMatrix = popMatrix();
      // pushMatrix(modelMatrix); /////  disconnect


// ear
// modelMatrix = popMatrix();
      pushMatrix(modelMatrix); /////  add new matrix for modifying(use the same as head)
      							// can't pop the head, gonna use head.

    modelMatrix.translate(-0.5, 0.0, 1.2);
    // modelMatrix.rotate(, 0, 1, 0); // fixed
        // modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 1, 0); // fixed

      modelMatrix.rotate(90, 1, 0, 0);
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      // modelMatrix.scale(0.8, 0.8, 0.8);
      modelMatrix.scale(2, 2, 2);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);

//ear joint
for(i=0; i<5; i++){
modelMatrix.translate(0.0, 0.1, 0.0);
    // modelMatrix.rotate(, 0, 1, 0); // fixed
        modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	currentAngle*0.2, 0, 0, 1); // fixed

      // modelMatrix.rotate(currentAngle, 1, 0, 0);
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      modelMatrix.scale(0.7, 0.7, 0.7);
      // modelMatrix.scale(1, 1.5, 1.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);

}

  	modelMatrix = popMatrix(); // back to the original(head)
      pushMatrix(modelMatrix); /////  add new matrix for modifying

//ear2
   modelMatrix.translate(0.5, 0.0, 1.2);
    // modelMatrix.rotate(, 0, 1, 0); // fixed
        // modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 1, 0); // fixed

      modelMatrix.rotate(90, 1, 0, 0);
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      // modelMatrix.scale(0.8, 0.8, 0.8);
      modelMatrix.scale(2, 2, 2);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);

      //ear2 joint
for(i=0; i<5; i++){
	// modelMatrix = popMatrix();
 //      pushMatrix(modelMatrix); /////  disconnect

modelMatrix.translate(0.0, 0.1, 0.0);
    // modelMatrix.rotate(, 0, 1, 0); // fixed
        modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	-currentAngle*0.2, 0, 0, 1); // fixed

      // modelMatrix.rotate(currentAngle, 1, 0, 0);
      // modelMatrix.rotate(currentAngle, 0, 0, 1);
      modelMatrix.scale(0.7, 0.7, 0.7);
      // modelMatrix.scale(1, 1.5, 1.5);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, lfStart/floatsPerVertex,lfVerts.length/floatsPerVertex);

}

	modelMatrix = popMatrix(); // disconnect with the previous modified matrix, 
								//restore it to be the original(head)
	pushMatrix(modelMatrix); /////  add new matrix for modifying

  //     // body
  
	modelMatrix.translate(0.0, 1.5, 0.0);
	modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	currentAngle*0.5, 0, 0, 1); // fixed
      // modelMatrix.rotate(-90, 0, 0, 1); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      // modelMatrix.rotate(180, 0, 1, 0); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(1.0, 0.8, 0.5);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, sphStart/floatsPerVertex,sphVerts.length/floatsPerVertex);


// leg1
	modelMatrix = popMatrix(); // disconnect with the previous modified matrix, 
								//restore it to be the original(head)
	pushMatrix(modelMatrix); /////  add new matrix for modifying


	modelMatrix.translate(-0.8, 1.0, -0.2);
	// modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 0, 1); // fixed
      modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.15, 0.25, 0.15);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);


for(i=0; i<5; i++){
modelMatrix.translate(0.0, 0.8, 0.0);
	modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	currentAngle*0.2, 0, 0, 1); // fixed
      // modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      // modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.8, 0.8, 0.8);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);
}



// leg2
	modelMatrix = popMatrix(); // disconnect with the previous modified matrix, 
								//restore it to be the original(head)
	pushMatrix(modelMatrix); /////  add new matrix for modifying


	modelMatrix.translate(0.35, 1.0, -0.2);
	// modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 0, 1); // fixed
      modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.15, 0.25, 0.15);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);


for(i=0; i<5; i++){
modelMatrix.translate(0.0, 0.8, 0.0);
	modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	currentAngle*0.2, 0, 0, 1); // fixed
      // modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      // modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.8, 0.8, 0.8);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);
}
     



// leg3
	modelMatrix = popMatrix(); // disconnect with the previous modified matrix, 
								//restore it to be the original(head)
	pushMatrix(modelMatrix); /////  add new matrix for modifying


	modelMatrix.translate(-0.8, 1.5, -0.2);
	// modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 0, 1); // fixed
      modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.15, 0.25, 0.15);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);


for(i=0; i<5; i++){
modelMatrix.translate(0.0, 0.8, 0.0);
	modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	currentAngle*0.2, 0, 0, 1); // fixed
      // modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      // modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.8, 0.8, 0.8);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);
}



// leg4
	modelMatrix = popMatrix(); // disconnect with the previous modified matrix, 
								//restore it to be the original(head)
	pushMatrix(modelMatrix); /////  add new matrix for modifying


	modelMatrix.translate(0.35, 1.5, -0.2);
	// modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 0, 1); // fixed
      modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.15, 0.25, 0.15);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);


for(i=0; i<5; i++){
modelMatrix.translate(0.0, 0.8, 0.0);
	modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	currentAngle*0.2, 0, 0, 1); // fixed
      // modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      // modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.8, 0.8, 0.8);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);
}

// tail
	modelMatrix = popMatrix(); // disconnect with the previous modified matrix, 
								//restore it to be the original(head)
	pushMatrix(modelMatrix); /////  add new matrix for modifying


	modelMatrix.translate(-0.4, 2.0, 0.5);
	// modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 0, 1); // fixed
      modelMatrix.rotate(45, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.15, 0.25, 0.15);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);


for(i=0; i<5; i++){
modelMatrix.translate(0.0, -0.8, 0.0);
	modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	currentAngle*0.2, 0, 0, 1); // fixed
      // modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      // modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.9, 0.9, 0.9);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLES, bhStart/floatsPerVertex,bhVerts.length/floatsPerVertex);
}

// eyes
	modelMatrix = popMatrix(); // disconnect with the previous modified matrix, 
								//restore it to be the original(head)
	pushMatrix(modelMatrix); /////  add new matrix for modifying


	modelMatrix.translate(-0.2, -0.8, 0.2);
	// modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 0, 1); // fixed
      modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.25, 0.15, 0.25);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, sphStart/floatsPerVertex,sphVerts.length/floatsPerVertex);


// eyes
	modelMatrix = popMatrix(); // disconnect with the previous modified matrix, 
								//restore it to be the original(head)
	pushMatrix(modelMatrix); /////  add new matrix for modifying


	modelMatrix.translate(0.5, -0.8, 0.2);
	// modelMatrix.rotate(
        	// -90, 0, 1, 0);
        	// currentAngle*0.5, 0, 0, 1); // fixed
      modelMatrix.rotate(90, 1, 0, 0); // fixed
      // modelMatrix.rotate(-45, 1, 0, 0); // fixed
      modelMatrix.rotate(180, 0, 0, 1); // fixed
      // modelMatrix.rotate(-135, 0, 0, 1); // fixed
      // modelMatrix.rotate(currentAngle, 0, 1, 0); // fixed
      modelMatrix.scale(0.25, 0.15, 0.25);
      // modelMatrix.scale(2.5, 2.5, 2.5);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0.5, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, sphStart/floatsPerVertex,sphVerts.length/floatsPerVertex);


}



function drawGrid(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas){


      modelMatrix.setTranslate(0.0, 0.0, 0.0);
      viewMatrix.rotate(-90.0, 1,0,0);  // new one has "+z points upwards",
                                          // made by rotating -90 deg on +x-axis.
                                          // Move those new drawing axes to the 
                                          // bottom of the trees:
      viewMatrix.translate(0.0, 0.0, -0.6); 
      viewMatrix.scale(0.4, 0.4,0.4);   // shrink the drawing axes 
                                          //for nicer-looking ground-plane, and
      // Pass the modified view matrix to our shaders:
      
      mvpMatrix.set(projMatrix).multiply(viewMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      
      // Now, using these drawing axes, draw our ground plane: 
      gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                    gndStart/floatsPerVertex, // start at this vertex number, and
                    gndVerts.length/floatsPerVertex);   // draw this many vertices
}


function drawAxes(gl, u_MvpMatrix, u_ModelMatrix, u_NormalMatrix, u_ColorMod, currentAngle, treeAngle, canvas){


      modelMatrix.translate(1.5, 0, 0);
      modelMatrix.scale(2,2,2);
      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
      gl.uniform4f(u_ColorMod, 0, 0, 0, 1);
      gl.drawArrays(gl.LINES,             // use this drawing primitive, and
                    axStart/floatsPerVertex, // start at this vertex number, and
                    axVerts.length/floatsPerVertex);   // draw this many vertices

}



    function myMouseDown(ev, gl, canvas) {
  //==============================================================================
  // Called when user PRESSES down any mouse button;
  //                  (Which button?    console.log('ev.button='+ev.button);   )
  //    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
    var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  //  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
                 (canvas.width/2);      // normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
                 (canvas.height/2);
  //  console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
    
    isDrag = true;
                          // set our mouse-dragging flag
    xMclik = x;                         // record where mouse-dragging began
    yMclik = y;
  };


  function myMouseMove(ev, gl, canvas) {
  //==============================================================================
  // Called when user MOVES the mouse with a button already pressed down.
  //                  (Which button?   console.log('ev.button='+ev.button);    )
  //    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

    if(isDrag==false) return;       // IGNORE all mouse-moves except 'dragging'

    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
    var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  //  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
                 (canvas.width/2);      // normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
                 (canvas.height/2);

    // find how far we dragged the mouse:
    xMdragTot += (x - xMclik);          // Accumulate change-in-mouse-position,&
    yMdragTot += (y - yMclik);
    // AND use any mouse-dragging we found to update quaternions qNew and qTot.
    //===================================================
    dragQuat(x - xMclik, y - yMclik);
    //===================================================
    xMclik = x;                         // Make NEXT drag-measurement from here.
    yMclik = y;
    
    
  };

  function myMouseUp(ev, gl, canvas) {
  //==============================================================================
  // Called when user RELEASES mouse button pressed previously.
  //                  (Which button?   console.log('ev.button='+ev.button);    )
  //    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
    var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  //  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
                 (canvas.width/2);      // normalize canvas to -1 <= x < +1,
    var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
                 (canvas.height/2);
  //  console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
    
    isDrag = false;                     // CLEAR our mouse-dragging flag, and
    
    // accumulate any final bit of mouse-dragging we did:
    xMdragTot += (x - xMclik);
    yMdragTot += (y - yMclik);
  //  console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);

    // AND use any mouse-dragging we found to update quaternions qNew and qTot;
    dragQuat(x - xMclik, y - yMclik);

   
  };


  function dragQuat(xdrag, ydrag) {
  //==============================================================================
  // Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
  // We find a rotation axis perpendicular to the drag direction, and convert the 
  // drag distance to an angular rotation amount, and use both to set the value of 
  // the quaternion qNew.  We then combine this new rotation with the current 
  // rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
  // 'draw()' function converts this current 'qTot' quaternion to a rotation 
  // matrix for drawing. 
    var res = 5;
    var qTmp = new Quaternion(0,0,0,1);
    
    var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
    // console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
    qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist*150.0);
    // (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
                // why axis (x,y,z) = (-yMdrag,+xMdrag,0)? 
                // -- to rotate around +x axis, drag mouse in -y direction.
                // -- to rotate around +y axis, drag mouse in +x direction.
                
    qTmp.multiply(qNew,qTot);     // apply new rotation to current rotation. 
    //--------------------------
    // IMPORTANT! Why qNew*qTot instead of qTot*qNew? (Try it!)
    // ANSWER: Because 'duality' governs ALL transformations, not just matrices. 
    // If we multiplied in (qTot*qNew) order, we would rotate the drawing axes
    // first by qTot, and then by qNew--we would apply mouse-dragging rotations
    // to already-rotated drawing axes.  Instead, we wish to apply the mouse-drag
    // rotations FIRST, before we apply rotations from all the previous dragging.
    //------------------------
    // IMPORTANT!  Both qTot and qNew are unit-length quaternions, but we store 
    // them with finite precision. While the product of two (EXACTLY) unit-length
    // quaternions will always be another unit-length quaternion, the qTmp length
    // may drift away from 1.0 if we repeat this quaternion multiply many times.
    // A non-unit-length quaternion won't work with our quaternion-to-matrix fcn.
    // Matrix4.prototype.setFromQuat().
  //  qTmp.normalize();           // normalize to ensure we stay at length==1.0.
    qTot.copy(qTmp);
    
  };

  

    var g_last = Date.now();

    function animate(angle) {
    //==============================================================================
      // Calculate the elapsed time
      var now = Date.now();
      var elapsed = now - g_last;
      g_last = now;
      
      // Update the current rotation angle (adjusted by the elapsed time)
      //  limit the angle to move smoothly between +20 and -85 degrees:
    if(angle >  180.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
    if(angle < -180.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
      
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
    }

    function animatetree(angle) {
  // Calculate the elapsed time
      var now = Date.now();
      var elapsed = now - g_last;
      g_last = now;
      
      // Update the current rotation angle (adjusted by the elapsed time)
      //  limit the angle to move smoothly between +20 and -85 degrees:
    if(angle >  100.0 && TREE_ANGLE_STEP > 0) TREE_ANGLE_STEP = -TREE_ANGLE_STEP;
    if(angle < -100.0 && TREE_ANGLE_STEP < 0) TREE_ANGLE_STEP = -TREE_ANGLE_STEP;
      
    var newAngle = angle + (TREE_ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;

    }

    function runStop() {
        // Called when user presses the 'Run/Stop' button
        if(ANGLE_STEP*ANGLE_STEP > 1) {
          myTmp = ANGLE_STEP;
          ANGLE_STEP = 0;
        }
        else {
         ANGLE_STEP = myTmp;
        }
        }

    function resize()
    {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight-100;
    }

    function makeGroundGrid() {
    //==============================================================================
    // Create a list of vertices that create a large grid of lines in the x,y plane
    // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

      var xcount = 100;     // # of lines to draw in x,y to make the grid.
      var ycount = 100;   
      var xymax = 50.0;     // grid size; extends to cover +/-xymax in x and y.
      var xColr = new Float32Array([0.0, 1.0, 0.0]);  // bright yellow
      var yColr = new Float32Array([1.0, 1.0, 0.0]);  // bright green.
      
      // Create an (global) array to hold this ground-plane's vertices:
      gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
                // draw a grid made of xcount+ycount lines; 2 vertices per line.
                
      var xgap = xymax/(xcount-1);    // HALF-spacing between lines in x,y;
      var ygap = xymax/(ycount-1);    // (why half? because v==(0line number/2))
      
      // First, step thru x values as we make vertical lines of constant-x:
      for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
        if(v%2==0) {  // put even-numbered vertices at (xnow, -xymax, 0)
          gndVerts[j  ] = -xymax + (v  )*xgap;  // x
          gndVerts[j+1] = -xymax;               // y
          gndVerts[j+2] = 0.0;                  // z
          gndVerts[j+3] = 1.0;
        }
        else {        // put odd-numbered vertices at (xnow, +xymax, 0).
          gndVerts[j  ] = -xymax + (v-1)*xgap;  // x
          gndVerts[j+1] = xymax;                // y
          gndVerts[j+2] = 0.0;                  // z
          gndVerts[j+3] = 1.0;
        }
        gndVerts[j+4] = xColr[0];     // red
        gndVerts[j+5] = xColr[1];     // grn
        gndVerts[j+6] = xColr[2];     // blu
        gndVerts[j+7] = 0;  //dx
        gndVerts[j+8] = 0;  //dy
        gndVerts[j+9] = 1;  //dz
      }
      // Second, step thru y values as wqe make horizontal lines of constant-y:
      // (don't re-initialize j--we're adding more vertices to the array)
      for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
        if(v%2==0) {    // put even-numbered vertices at (-xymax, ynow, 0)
          gndVerts[j  ] = -xymax;               // x
          gndVerts[j+1] = -xymax + (v  )*ygap;  // y
          gndVerts[j+2] = 0.0;                  // z
          gndVerts[j+3] = 1.0;
        }
        else {          // put odd-numbered vertices at (+xymax, ynow, 0).
          gndVerts[j  ] = xymax;                // x
          gndVerts[j+1] = -xymax + (v-1)*ygap;  // y
          gndVerts[j+2] = 0.0;                  // z
          gndVerts[j+3] = 1.0;
        }
        gndVerts[j+4] = yColr[0];     // red
        gndVerts[j+5] = yColr[1];     // grn
        gndVerts[j+6] = yColr[2];     // blu
        gndVerts[j+7] = 0;  //dx
        gndVerts[j+8] = 0;  //dy
        gndVerts[j+9] = 1;  //dz
      }
    }
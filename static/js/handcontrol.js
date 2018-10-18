var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

var paddleMap = new Map();
var enableAudio = false;

// X, Y position and size of ball

var xPos = canvas.width/2;
var yPos = canvas.height-20;
var xMove = (Math.random()*5)+2;
var yMove = (Math.random()*5)+2;
var ballRadius = 10;

var socketurl = "ws://" + "127.0.0.1:5006";
//console.log(" socket url ...", socketurl);

var ws;
var box, paddle; 
var paddleHeight = 30;
var paddleWidth = 250;
var x_coord = (canvas.width-paddleWidth)/2;
var paddleLeft = false;
var paddleRight = false;
var offset = 10;
var paddleBodies = new Map();

// Paddle size and position

var x_coord = (canvas.width-paddleWidth)/2;
var paddleLeft = false;
var paddleRight = false;
var offset = 10;


//pause game functionality
var pauseGame = false;
var pauseGameAnimationDuration = 500;

function pauseGamePlay() {
	//console.log("paused game play");
    pauseGame = !pauseGame;
    //console.log("paused or not" + pauseGame);
    if (pauseGame) {
       // paddle.setLinearVelocity(Vec2(0, 0))
        $(".pauseoverlay").show()
        $(".overlaycenter").animate({
            opacity: 1,
            fontSize: "4vw"
        }, pauseGameAnimationDuration, function () {});
    } else {
        //paddle.setLinearVelocity(Vec2(3, 0))
		
        $(".overlaycenter").animate({
            opacity: 0,
             fontSize: "0vw"
        }, pauseGameAnimationDuration, function () {
            $(".pauseoverlay").hide()
        });
        animate();
    }
}


function addUI() {
    // Add keypress event listener to pause game
    document.onkeyup = function (e) {
        var key = e.keyCode ? e.keyCode : e.which;
        if (key == 32) {
            //console.log("spacebar pressed")
            pauseGamePlay()
        }
        if (key == 83) {
            $("input#sound").click()
        }
    }

}

$("input#sound").click(function () {
    enableAudio = $(this).is(':checked')
    soundtext = enableAudio ? "sound on" : "sound off";
    $(".soundofftext").text(soundtext)
});


///CREATE TOGGLE THAT PAUSES WHEN CLICKED

// Function that creates scorebar and shows your current score (+1 for destroying a brick)

function scorebar() {
	if (!pauseGame) {
    	ctx.font = "18px Arial";
    	ctx.fillStyle = "#1abc9c";
    	ctx.fillText("Your score = "+score, 10, 25);
    }
    
    ctx.fillText('Pause (space bar)', 10, 45);
}


// Bricks
var brickHeight = 25; 
var brickWidth = 50;
var brickPadding = 20;
var brickRows = (canvas.height-70)/(brickHeight + brickPadding) - 7;
var brickColumns = (canvas.width-50)/(brickWidth + brickPadding);
var brickOffsetTop = canvas.height - 330;
var paddingSum = brickPadding * (brickColumns - 1);
var widthSum = brickColumns * brickWidth;
var brickOffsetLeft = (canvas.width-widthSum - paddingSum)/2.0;


paddle = new Paddle(x_coord, canvas.height-paddleHeight-offset, paddleWidth, paddleHeight);

ws = new WebSocket(socketurl);

function connectSocket() {
    ws.onopen = function () {
        $(".disableoverlay").hide();
        $("button").prop("disabled", false)
        console.log("Connection opened");
    };

    ws.onmessage = function (evt) {
        data = JSON.parse(evt.data);
        console.log("data.data is " + evt.data);
        getXCord(data.data);
        console.log("x_coord is " + x_coord);	
    };

    ws.onclose = function () {
        console.log("Connection is closed...");
        $(".disableoverlay").show();
        $("button").prop("disabled", true)

        setTimeout(function () {
            connectSocket();
           
        }, 3000)
    };
}

connectSocket();  

function getXCord(data) {

    pointindex = 0;
    var currentMap = new Map()
    data.forEach(function (point) {
        currentMap.set(point.id_label, { timestamp: Date.now() })
        if (!paddleBodies.has(point.id_label)) {
            paddleMap.set(point.id, point)
           
        }
        box = point.box;
        top = box[0] * windowHeight;
        left = (box[1]) * windowWidth;
        width = Math.abs(box[3] - box[1]) * windowWidth;
        height = Math.abs(box[2] - (box[0])) * windowHeight;
        midx = point.box_center[0];
        
	x_coord = (midx * canvas.width/290) - 180;
    })
}


if (navigator.mediaDevices === undefined) {
  navigator.mediaDevices = {};
}

if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = function(constraints) {


    var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
    }

    
    return new Promise(function(resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  }
}


var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var source;
var stream;


var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

var distortion = audioCtx.createWaveShaper();
var gainNode = audioCtx.createGain();
var biquadFilter = audioCtx.createBiquadFilter();
var convolver = audioCtx.createConvolver();

// distortion curve for the waveshaper, thanks to Kevin Ennis
// http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion

// grab audio track via XHR for convolver node

var soundSource;

ajaxRequest = new XMLHttpRequest();

ajaxRequest.open('GET', 'https://mdn.github.io/voice-change-o-matic/audio/concert-crowd.ogg', true);

ajaxRequest.responseType = 'arraybuffer';


ajaxRequest.onload = function() {
  var audioData = ajaxRequest.response;

  audioCtx.decodeAudioData(audioData, function(buffer) {
      soundSource = audioCtx.createBufferSource();
      convolver.buffer = buffer;
    }, function(e){ console.log("Error with decoding audio data" + e.err);});


};

ajaxRequest.send();



var drawVisual;


if (navigator.mediaDevices.getUserMedia) {
   console.log('getUserMedia supported.');
   var constraints = {audio: true}
   navigator.mediaDevices.getUserMedia (constraints)
      .then(
        function(stream) {
           source = audioCtx.createMediaStreamSource(stream);
           source.connect(analyser);
           analyser.connect(distortion);
           distortion.connect(biquadFilter);
           biquadFilter.connect(gainNode);
           convolver.connect(gainNode);
           gainNode.connect(audioCtx.destination);
          

      })
      .catch( function(err) { console.log('The following gUM error occured: ' + err);})
} else {
   console.log('getUserMedia not supported on your browser!');
}



var index = 0;
var brickRow = [];
var brickRowArrays = [];
var bricks = [];

brickRow[0] = {numBricks: 5, status: 1};	  
brickRowArrays[0] = [1,3,4,12,13];
bricks[0] = [];
for (c = 0; c < 5; c++) {
	var brickXpos = brickRowArrays[0][c]*(brickWidth+brickPadding) + brickOffsetLeft; 
	var brickYpos = brickOffsetTop; //need to get row number and column number
	bricks[0][c] =  {x:brickXpos, y:brickYpos, status:1 };
}		

function storeBricks() {
	if (!pauseGame) {
		index ++;
		analyser.fftSize = 256;
    	var bufferLengthAlt = analyser.frequencyBinCount;
    	var dataArrayAlt = new Uint8Array(bufferLengthAlt);
    	analyser.getByteFrequencyData(dataArrayAlt);
    
    	var barHeight; // max is around 235

		if(index % 100 == 0) {		
			var counter = index / 100;
    		barHeight = Math.max.apply(Math, dataArrayAlt);

    		var heightPercent = barHeight/235.00;      
    		var numColumns = Math.round(brickColumns * heightPercent);
     		brickRow[counter] = {numBricks: numColumns};	  
     		var arr = [];
     	
     		try {
			var intendedLength = brickRow[counter].numBricks;
			while(arr.length < brickRow[counter].numBricks){ 
			var randomnumber = Math.floor(Math.random()*brickColumns); 
			if(arr.indexOf(randomnumber) > -1) continue;
				arr[arr.length] = randomnumber; 
				brickRowArrays[counter] = arr;       		
				} 
			}
			catch(e) {
				console.log(e);
			} 		
			bricks[counter] = [];
			

			for ( i = 0; i < brickRowArrays[counter].length; i ++) {
				var brickXpos = (brickRowArrays[counter][i]*(brickWidth+brickPadding))+brickOffsetLeft;
				var brickYpos = (brickOffsetTop - counter * (brickHeight+brickPadding)); 
				if (counter < brickRows) {
					bricks[counter][i] = {x:brickXpos, y:brickYpos, status:1 }; 
				}
				else {
					bricks[counter][i] = {x:brickXpos, y:brickYpos, status:2 }; 
				}
			}		
		}
	}
}


function updateBricks() {
	var count = 0;
	for (i = 0; i < bricks[0].length; i ++) {    
		if (bricks[0] == 0) {
			count++;
		}	
	}
	if (count == bricks[0].length) {  		
		brickRowArrays.shift(); 
		for (i = 0; i < bricks[brickRows-1].length; i ++){
			b = bricks[brickRows-1][i];
			b.status = 1;
		};
		
	}
}



function printBricks() {
	for (r = 0; r < brickRows; r++) {
		for (c = 0; c < bricks[r].length; c++){ 
			var b = bricks[r][c]; 
			if (b.status == 1) {   
        		ctx.beginPath();
        		ctx.rect(b.x, b.y, brickWidth, brickHeight);
        		ctx.fillStyle = "#e74c3c";
        		ctx.fill();
        		ctx.closePath();			
			}
		}
	}
}

// Function that detects collision with brick
function bricksCollision() {
    for ( r = 0; r < bricks.length; r ++ ) {
        for (c = 0; c < bricks[r].length; c ++) {
            var b = bricks[r][c];
            if(b.status == 1) {
                if(xPos > b.x && xPos < b.x+brickWidth && yPos > b.y && yPos < b.y+brickHeight) {
                    yMove = -yMove;
                    b.status = 0;
                    score++;
                    ballColor = randomColor();
                }
            }
        }
    }
}

// Function that creates the ball
function ball() {
    ctx.beginPath();
    ctx.arc(xPos, yPos, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = ballColor;
    ctx.fill();
    ctx.closePath();
}



// Uncategorized variables
var score = 0;
var ballColor = randomColor();

function randomColor() {
    var r = 255*Math.random()|0,
        g = 255*Math.random()|0,
        b = 255*Math.random()|0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}


function Paddle(x,y, timestamp, id) {
	this.x = x;
	this.y = y;
	this.timestamp = timestamp;
	this.id = id;
	
	this.draw = function() {
		ctx.beginPath();
   		ctx.rect(this.x, this.y, paddleWidth, paddleHeight);
    	ctx.fillStyle = "#3498db";
    	ctx.fill();
    	ctx.closePath();				
	}
	
	this.update = function(x_update) {
		this.x = x_update;
		this.draw();
		}
}

function animate() {
	if (!pauseGame) {
		requestAnimationFrame(animate);
		ctx.clearRect(0, 0, innerWidth, innerHeight);
		paddle.update(x_coord);
    	scorebar();
    	ball();
    	storeBricks();
		updateBricks();
		printBricks();
		bricksCollision();
		paddle.update(x_coord);
    	if(xPos + xMove > canvas.width-ballRadius || xPos + xMove < ballRadius) {
     	   xMove = -xMove;
    	}
    	if(yPos + yMove < ballRadius) {
        	yMove = -yMove;
    	}
    	else if (yPos + yMove > canvas.height-ballRadius-offset) {
        	if (xPos > x_coord && xPos < x_coord + paddleWidth) {
            	yMove = -yMove;
        	}
        	else {
        	}
   			}
    	if(paddleRight && x_coord < canvas.width-paddleWidth) {
        	x_coord += 7.5;
    	}
    	else if(paddleLeft && x_coord > 0) {
        	x_coord -= 7.5;
    	}
    	xPos += xMove;
    	yPos += yMove;	
    } 
}  

addUI();
animate();





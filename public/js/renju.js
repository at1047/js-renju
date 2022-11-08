// Declaring variables

var canvas = document.querySelector('canvas');
const socket = io();
// const socket = io('https://andrew-tai.com', {path: '/renju/socket.io'}); // USE THIS IN DEPLOYMENT

document.getElementById("restart").onclick = restart;
document.getElementById("undo").onclick = undo;
document.getElementById("hurryUp").onclick = hurryUp;
document.getElementById("chatButton").onclick = chatButton;
var messages = document.getElementById('messages');
var input = document.getElementById('input');
var form = document.getElementById('form');



var ctx = canvas.getContext('2d');
const boardSize = 19;

canvas.width  = canvas.offsetWidth;
canvas.height = canvas.width;
console.log(canvas.width)
console.log(canvas.height)
var dim = canvas.width;
var gridSpacing = dim/boardSize;
var padding = gridSpacing/2;

let clientTurn;
let dict;

// Socket functions from server

socket.on('initGame', () => {
    getName();
})

socket.on('message', message => {
    console.log(message);
})

socket.on('dict', serverDict => {
    dict = serverDict;
    console.log(dict);
    redrawEverything(dict);
})

socket.on('clientTurn', turn => {
    console.log("Your turn ID is: " + turn);
    clientTurn = turn;
    console.log(clientTurn);
})

socket.on('gameState', state => {
    console.log("Game state is: " + state);
    stateStr = (state == 1)? "You Won!!!" : "You lost :((";
    alert(stateStr);
})

socket.on('alert', msg => {
    alert(msg);
})

socket.on('reject', () => {
    window.location.href = '/';
})

socket.on('chatMessage', function(msg) {
    var item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    item.scrollIntoView();
});

// Socket functions from Client

function getName() {
    userName = prompt("What is your name?");
    socket.emit('userName', userName);
}


function restart() {
    socket.emit('restart');
}

function undo() {
    socket.emit('undo');
}

function hurryUp() {
    console.log("emit hurry up");

}

function emitMove([x,y]) {
    socket.emit('clientMove', [x,y]);
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    // socket.emit('reemit', input)
    if (input.value) {
        
        socket.emit('chatMessage', input.value);
        input.value = '';
    }
});

// Game functions

function drawGrid() {
    ctx.beginPath();
    for (var x = padding; x <= dim; x += gridSpacing) {
        ctx.moveTo(x, padding);
        ctx.lineTo(x, dim - padding);
    }

    for (var y = padding; y <= dim; y += gridSpacing) {
        ctx.moveTo(padding, y);
        ctx.lineTo(dim - padding, y);
    }
    ctx.strokeStyle = "black";
    ctx.stroke();
}

function drawPiece(x, y, color, alpha) {
    let xCoord = x * gridSpacing + padding  
    let yCoord = y * gridSpacing + padding  
    ctx.beginPath();
    ctx.arc(xCoord, yCoord, gridSpacing * 0.45, 0*Math.PI, 2*Math.PI);
    ctx.fillStyle = color + alpha;
    ctx.strokeStyle = color + alpha;
    ctx.fill();
    ctx.stroke();
}

function drawAllPieces(dict) {
    for (x in dict) {
        for (y in dict[x]) {
            if (dict[x][y] != 0) {
                drawPiece(x, y, dict[x][y], "");
            }
        }
    }   
}

function redrawEverything(dict) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawAllPieces(dict);
}

function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    xGrid = Math.max(Math.floor(x / gridSpacing), 0);
    yGrid = Math.max(Math.floor(y / gridSpacing), 0);
    return [xGrid, yGrid]
}

function hover(x,y) {

    if (dict[x][y] == 0 && !(x == currentHover['x'] && y == currentHover['y'])) {
        redrawEverything(dict);
        currentHover['x'] = x;
        currentHover['y'] = y;
        drawPiece(x,y,clientTurn, "66");
    }
}

canvas.addEventListener('mousedown', (e) => {
    [x, y] = getCursorPosition(canvas, e);
    emitMove([x,y]);
})

let currentHover = {'x': undefined, 'y': undefined};

canvas.addEventListener('mousemove', (e) => {
    [x, y] = getCursorPosition(canvas, e);
    hover(x,y);
})

canvas.addEventListener('mouseleave', (e) => {
    redrawEverything(dict);
    currentHover = {'x': undefined, 'y': undefined};
})

window.addEventListener('resize', () => {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    dim = canvas.width;
    gridSpacing = dim/boardSize;
    padding = gridSpacing/2;
    redrawEverything(dict);
})


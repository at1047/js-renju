const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
var fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static('public'));


const hostname = '0.0.0.0'
const port = 8080;



// Socket functions from server

io.on('connection', socket => {
    socket.broadcast.emit('message', socket.id + ' has joined');
    socket.emit('message', 'Welcome to Renju Game');
    console.log('New WS Connection...' + socket.id);
    

    
    let clientTurn;
    if (!players.includes(socket.id)) {
        players.push(socket.id);
    }

    console.log(players);

    clientTurn = players.indexOf(socket.id)
    for (let i = 0; i < players.length; i ++) {
        io.to(players[i]).emit('clientTurn', i);
    }

    // socket.emit('clientTurn', clientTurn);
    socket.emit('dict', dict);
    

    

    socket.on('clientMove', move => {
        const turnBin = (turn == 1)? 0 : 1;
        if (socket.id == players[turnBin]) {
            console.log(turnBin + move);
            let x = move[0]
            let y = move[1]
            // console.log("Move on x: " + x + ", y: " + y);
            newDictAndState = game(x,y)
            io.emit('dict', newDictAndState[0]);

            if (newDictAndState[1] == 1) {
                socket.emit('gameState', '1');
                socket.broadcast.emit('gameState', '0');
            }
        }
    });

    socket.on('hurryUp', () => {
        console.log(socket.id + " said hurry up!");
        socket.broadcast.emit('alert', 'Please hurry up');
    })

    socket.on('restart', () => {
        console.log(socket.id + " requested to restart");
        restart();
        io.emit('dict', dict);
    });

    socket.on('undo', () => {
        console.log(socket.id + " requested to undo");
        undo();
        io.emit('dict', dict);
    });

    socket.once('disconnect', () => {
        socket.broadcast.emit('message', socket.id + 'A user has left the game');
        players.splice(players.indexOf(socket.id), 1);
        console.log(socket.id + " has left the game.")
        console.log(players)
        for (let i = 0; i <= players.length; i ++) {
            io.to(players[i]).emit('clientTurn', i);
        }
    });
});



// Socket functions from Client


const boardSize = 19;
const whitePiece = "#FFFFFF"
const blackPiece = "#000000"
let playOrder = [];
let players = [];
let turn = 1;
let state = 0;
const directions = [[0,1], [1,0], [1,1], [1,-1]]; // Vertical, Horizontal, Up right diag, up left diag

function restart() {
    playOrder = [];
    turn = 1;
    state = 0;
    dict = initBoard();
}



function initBoard() {
    let dict = {};
    for (var x = 0; x <= boardSize; x++) {
        dict[x] = {};
        for (var y = 0; y <= boardSize; y++) {
            dict[x][y] = 0;
        }
    }
    return dict;
}

function undo() {
    lastPiece = playOrder.pop();
    rmPiece(lastPiece['x'], lastPiece['y']);
    turn *= -1;
}

function addPiece(x, y, color) {
    dict[x][y] = (color == blackPiece)? 1 : 2; 
    colorString = (color == blackPiece)? "Black Piece" : "White Piece";
    console.log(colorString + " added at " + x + ", " + y);
    playOrder.push({'x': x, 'y': y});
}

function rmPiece(x, y) {
    dict[x][y] = 0;
    console.log(colorString + " removed at " + x + ", " + y);
}

function checkLength(x, y) {
    let counter;
    let infoObj = {0: undefined, 1: undefined, 2: undefined, 3: undefined, "win": -1};
    let lengthInfo;
    for (var i = 0; i < directions.length; i++) {
        counter = 1;
        lengthInfo = {}
        const basePiece = dict[x][y];
        const dir = directions[i]; 
        const dirX = dir[0];
        const dirY = dir[1]; 
        let x1 = x2 = x;
        let y1 = y2 = y;
        while (x1 > 0 && x1 < boardSize && y1 > 0 && y1 < boardSize && dict[x1 + dirX][y1 + dirY] == basePiece) {
            x1 += dirX;
            y1 += dirY;
            counter++;
        }
        lengthInfo["a"] = [x1, y1];
        while (x2 > 0 && x2 < boardSize && y2 > 0 && y2 < boardSize && dict[x2 - dirX][y2 - dirY] == basePiece) {
            x2 -= dirX;
            y2 -= dirY;
            counter++;
        }
        lengthInfo["b"] = [x2, y2];
        lengthInfo["len"] = counter;
        infoObj[i] = lengthInfo;
        if (counter >= 5) {
            infoObj["win"] = i;
        }
    }
    return infoObj; 
}

function game(x, y) {
    const currentTurn = (turn == 1)? blackPiece : whitePiece;
    if (dict[x][y] == 0) {
        addPiece(x, y, currentTurn);
        
        infoObj = checkLength(x, y);
        if (infoObj["win"] != -1) {
            state = 1
        }
        turn *= -1;
        return [dict, state];
    }
    
}

dict = initBoard()

// app.use(logger)

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname+'/index.html')); 
//     console.log('index page')
// });

// app.get('/renju', (req, res) => {
//     res.sendFile(path.join(__dirname+'/renju.html')); 
//     console.log('renju page')
// });

// function logger(req, res, next) {
//     console.log('Log');
//     next();
// }

server.listen(port, hostname, () => console.log('server running on port ' + port)); 
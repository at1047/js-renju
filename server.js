// Declaring server variables

const express = require('express')
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
var fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static('public'));

// Declaring network variables

const hostname = '0.0.0.0';
const port = 8080;

// Declaring database variables

// const MongoClient = require('mongodb').MongoClient;
// const url = "mongodb://localhost:27017/mydb"

// function addData(winner, loser) {



//     MongoClient.connect(url, (err, client) => {
//         if (err) {
//             throw err;
//         } else {
//             const db = client.db('renju');
//             console.log("Database created!");
//             db.collection('renju').insertOne(data);
//             console.log("Data inserted...")
//         }
//         db.close();
//     });
// }


// Socket functions from server

let numConnections = 0;

io.on('connection', socket => {
    // if (socket.handshake.url != '/renju.html') {
    //     socket.disconnect();
    //     console.log("Not renju page")
    //     return;
    // }

    if (numConnections >= 2) {
        socket.emit('reject');
    } else {
        socket.emit('message', 'Welcome to Renju Game');
        socket.emit('initGame');

        let info; 

        socket.on('userName', name => {
            const userName = name;
            socket.broadcast.emit('message', userName + ' has joined');
            
            info = {
                'socket.id': socket.id, 
                'userName': userName,
                'clientTurn': undefined
            }
            players.push(info);
            players = findClientTurn(players);
            console.log('New WS Connection: ' + userName);
            let ply;
            for (let i = 0; i < players.length; i ++) {
                ply = players[i]
                io.to(ply['socket.id']).emit('clientTurn', ply['clientTurn']);
            }
            console.log(players);
            numConnections = Object.keys(io.sockets.sockets).length;
            console.log("Number of players: " + numConnections);
        })
        
        socket.emit('dict', dict);

        socket.on('clientMove', move => {
            const turnBin = (turn == 1)? 0 : 1;
            if (info['userName'] == players[turnBin]['userName']) {
                // console.log(turnBin + move);
                let x = move[0]
                let y = move[1]
                // console.log("Move on x: " + x + ", y: " + y);
                newDictAndState = game(x,y,info['userName'])
                io.emit('dict', newDictAndState[0]);

                if (newDictAndState[1] == 1) {
                    socket.emit('gameState', '1');
                    socket.broadcast.emit('gameState', '0');
                    // addData(info[userName])
                }
            }
        });

        socket.on('hurryUp', () => {
            console.log(info['userName'] + " said hurry up!");
            socket.broadcast.emit('alert', info['userName'] + ' said please hurry up');
        });

        socket.on('restart', () => {
            console.log(info['userName'] + " requested to restart");
            restart(info['userName']);
            io.emit('dict', dict);
        });

        socket.on('undo', () => {
            console.log(info['userName'] + " requested to undo");
            undo(info['userName']);
            io.emit('dict', dict);
        });

        socket.once('disconnect', () => {
            socket.broadcast.emit('message', info['userName'] + ' has left the game');
            console.log(info['userName'] + ' has left the game.')
            
            let index;
            for (let i = 0; i < players.length; i ++) {
                ply = players[i];
                if (ply['socket.id'] == info['socket.id']) {
                    index = i;
                }
            }
            
            players.splice(index, 1);
            players = findClientTurn(players);
            
            if (players.length != 0) {
                for (let i = 0; i < players.length; i ++) {
                    ply = players[i];
                    io.to(ply['socket.id']).emit('clientTurn', ply['clientTurn']);
                }
            }
            console.log(players);
            numConnections = Object.keys(io.sockets.sockets).length; 
        });

    };
   
});

// Declaring game variables

const boardSize = 19;
const whitePiece = "#FFFFFF"
const blackPiece = "#000000"
let playOrder = [];
let players = [];
let turn = 1;
let state = 0;
const directions = [[0,1], [1,0], [1,1], [1,-1]]; // Vertical, Horizontal, Up right diag, up left diag
let playLog = [];

function restart(userName) {
    playOrder = [];
    turn = 1;
    state = 0;
    dict = initBoard();
    playLog.push({
        'player': userName,
        'move': 'Reset',
        'x': undefined,
        'y': undefined
    });
    console.log(playLog);
}

function findClientTurn(arr) {
    for (let i = 0; i < arr.length; i ++) {
        arr[i]['clientTurn'] = i;
    }

    return arr
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

function undo(userName) {
    if (playOrder.length > 0) {
        currentPlayer = playOrder[playOrder.length - 1]['userName']
        if (currentPlayer == userName) {
            lastPiece = playOrder.pop()
            rmPiece(lastPiece['x'], lastPiece['y']);
            turn *= -1;
            playLog.push({
                'player': userName, 
                'move': 'Remove',
                'x': lastPiece['x'],
                'y': lastPiece['y']
            });
            console.log(playLog);
        }
    }
}

function addPiece(x, y, color, userName) {
    dict[x][y] = (color == blackPiece)? 1 : 2; 
    colorString = (color == blackPiece)? "Black Piece" : "White Piece";
    let newLog = colorString + " added at " + x + ", " + y
    console.log(newLog);
    playLog.push({
        'player': userName,
        'move': 'Add',
        'x': x,
        'y': y
    })
    playOrder.push({
        'color': colorString,
        'userName': userName,
        'x': x,
        'y': y
    })
    console.log(playLog);
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

function game(x, y, userName) {
    const currentTurn = (turn == 1)? blackPiece : whitePiece;
    if (dict[x][y] == 0) {
        addPiece(x, y, currentTurn, userName);
        
        infoObj = checkLength(x, y);
        if (infoObj["win"] != -1) {
            state = 1
        }
        turn *= -1;
        
    }
    return [dict, state]; 
}

dict = initBoard()

server.listen(port, hostname, () => console.log('server running on port ' + port)); 

// Declaring server variables

const express = require('express')
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const fs = require('fs');
//const Sequelize = require('sequelize');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
//try {
    //const sequelize = new Sequelize('postgres://appseed:appseed@localhost:5432/test');
//} catch (e) {
    //console.log("Cant connect to server")
//}

app.use(express.static(path.join(__dirname, 'public')));

const hostname = '0.0.0.0';
const port = 8080;

// Declaring database variables

//try {
    //sequelize.authenticate();
    //console.log('Connection has been established successfully.');
    //const User = sequelize.define('user', {
        //firstname: {
            //type: Sequelize.STRING,
            //allowNull: false
        //},
        //lastName: {
            //type: Sequelize.STRING,
        //}
        
    //}, {
        ////options
    //})
//} catch (error) {
    //console.error('Unable to connect to the database:', error);
//}


// Socket functions from server

let numConnections = 0;

io.on('connection', socket => {
    if (numConnections >= 2) {
        socket.emit('reject');
    } else {
        socket.emit('message', 'Welcome to Renju Game');
        socket.emit('initGame');
        info = {
            'socket.id': socket.id, 
            'userName': undefined,
        }
        const myTurn = addNewUser(info);
        numConnections = Object.keys(io.sockets.sockets).length;
        console.log('New player initialised. Current players: ' + numConnections);
        socket.emit('dict', dict);
        const clientTurn = (myTurn == "Black")? "#000000" : "#FFFFFF";
        socket.emit('clientTurn', clientTurn);

        socket.on('userName', name => {
            players[myTurn]['userName'] = name;
            console.log('Name added: ' + name);
            console.log(players);
        });

        socket.on('clientMove', move => {
            if (myTurn == turn) {
                newDictAndState = game(move[0], move[1], clientTurn, myTurn);
                io.emit('dict', newDictAndState[0]);
                if (newDictAndState[1] == 1) {
                    socket.emit('gameState', '1');
                    socket.broadcast.emit('gameState', '0');
                }
            }
        });

        socket.on('hurryUp', () => {
            console.log(players[myTurn]['userName'] + " said hurry up!");
            const opp = players[myTurn]['userName'];
            socket.broadcast.emit('alert', opp + ' said please hurry up');

        });

        socket.on('restart', () => {
            console.log(players[myTurn]['userName'] + " requested to restart");
            restart(myTurn);
            io.emit('dict', dict);
        });

        socket.on('undo', () => {
            console.log(players[myTurn]['userName'] + " requested to undo");
            undo(myTurn, socket);
            io.emit('dict', dict);
        });

        socket.on('chatMessage', (msg) => {
            socket.emit('message', 'chatMessage');
            console.log('message: ' + msg);
            io.emit('chatMessage', msg);
        });

        socket.on('reemit', (msg) => {
            socket.emit('message', msg);
        })

        socket.once('disconnect', () => {
            players[myTurn] = {
                "socket.id": undefined,
                "userName": undefined
            }
            //socket.broadcast.emit('message', players[myTurn]['userName'] + ' has left the game');
            //console.log(players[myTurn]['userName'] + ' has left the game.')
            console.log(players);
            numConnections = Object.keys(io.sockets.sockets).length; 
        });
    };
});

// Declaring game variables

const boardSize = 19;
let playOrder = [];
let playLog = [];
let players = {
    "Black": {
        "socket.id": undefined,
        "userName": undefined
    },
    "White": {
        "socket.id": undefined,
        "userName": undefined
    }
};
let turn = "Black";
let state = 0;
const directions = [[0,1], [1,0], [1,1], [1,-1]];
dict = initBoard()

// Game Functions

function restart(myTurn) {
    playOrder = [];
    turn = "Black";
    state = 0;
    dict = initBoard();
    playLog.push({
        'player': players[myTurn]['userName'],
        'move': 'Reset',
        'x': undefined,
        'y': undefined
    });
    console.log(playLog);
}

function addNewUser(playerInfo) {
    if (players["Black"]['socket.id'] == undefined && players["White"]["socket.id"] == undefined) {
        turn = "Black"
    } else if (players["Black"] == undefined) {
        turn = "Black"
    } else {
        turn = "White"
    }
    players[turn] = playerInfo
    return turn
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

function undo(myTurn, socket) {
    if (playOrder.length > 0) {
        console.log(players);
        console.log(myTurn);
        console.log(players[myTurn]);
        if (players[myTurn]['userName'] == playOrder[playOrder.length - 1]['userName']) {
            lastPiece = playOrder.pop()
            dict[lastPiece['x']][lastPiece['y']] = 0;
            playLog.push({
                'player': players[myTurn]['userName'], 
                'move': 'Remove',
                'x': lastPiece['x'],
                'y': lastPiece['y']
            });
            nextTurn();
        } else {
            socket.emit('alert', "Your opponent already made a move! :'(");
        }
    }
}

function addPiece(x, y, clientTurn, myTurn) {
    dict[x][y] = clientTurn 
    playLog.push({
        'player': players[myTurn]['userName'],
        'move': 'Add',
        'x': x,
        'y': y
    })
    playOrder.push({
        'color': myTurn,
        'userName': players[myTurn]['userName'],
        'x': x,
        'y': y
    })
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

function game(x, y, clientTurn, myTurn) {
    if (dict[x][y] == 0) {
        addPiece(x, y, clientTurn, myTurn);
        infoObj = checkLength(x, y);
        if (infoObj["win"] != -1) {
            state = 1
        }
       nextTurn() 
    }
    console.log(playOrder)
    return [dict, state]; 
}

function nextTurn() {
    turn = (turn == "Black")? "White" : "Black" 
}

server.listen(port, hostname, () => console.log('server running on port ' + port)); 

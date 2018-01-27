const fs = require('fs');

class ProtocolHandler {

  constructor(client, thinker){

    this.version = 2.1;
    this.client = client;
    this.thinker = thinker;
    this.gameId = '';
    this.playerId = 0;
    this.messages = [];
    this.pieces = [];

    this.me = -1;
    this.you = -1;
    this.capture = -1;

    this.lastMessage = '';

  }

  sendToServer(messageToServer){
    console.log('[CLIENT] SEND TO SERVER: ' + messageToServer);
    this.lastMessage = messageToServer;
    this.client.write(messageToServer);
  }

  recv(data){
      if(data.includes('[THINKER] MOVE ')){
        this.sendToServer('PLAY ' + data.split(' ')[2]);
      }
  }

  handle(data){
    this.messages = data.split('\n');

    for(let message of this.messages){
      if(message[0] === '+'){
        this.handlePositive(message);
      }
      else if(message[0] === '-' ){

      }
    }
  }

  handlePositive(message){
    if(message.includes('+ MNM Gameserver')){
      this.sendToServer('VERSION ' + this.version + '\n');
    }
    else if(message.includes('+ Client version accepted - please send Game-ID to join')){
      this.sendToServer('ID ' + this.gameId + '\n');
    }

    else if(message.includes('+ PLAYING')){
      this.sendToServer('PLAYER ' + this.playerId + '\n');
    }

    else if(message.includes('+ YOU')){
      this.me = message[6];
    }

    else if(message.includes('+ QUIT')){
      process.exit(1);
    }

    else if(message.includes('+ OKTHINK')){
      this.thinker.stdin.write('[CLIENT] RETURN MOVE');
    }

    else if((+message[2] === 1) || (+message[2] === 0)){
      this.you = message[2];
    }

    else if(message.includes('+ ENDPLAYERS')){
    }

    else if(message.includes('+ CAPTURE')){
      this.capture = +message[10];
      this.writePlayers();
    }

    else if(message.includes('+ WAIT')){
      this.sendToServer('OKWAIT\n');
    }

    else if(message.includes('+ PIECELIST')){
      this.pieces = [];
    }

    else if(message.includes('+ PIECE')){
      let piece = { playerId: message[7], pieceNumber: message[9], position: message.split(' ')[2]};

      this.pieces.push(piece);
    }

    else if(message.includes('+ ENDPIECELIST')){
      this.sendToServer('THINKING\n');
      this.writePieces();
    }

  }

  writePieces(){
    if(this.pieces.length === 18){
      fs.writeFile('pieces.json', JSON.stringify(this.pieces), (err) => {
        this.thinker.stdin.write('[CLIENT] Pieces written!')
        if(err){
          console.log('[CLIENT] Could not write pieces.json');
        }
      });
    }
  }

  writePlayers(){
    fs.writeFile('players.json', JSON.stringify({me: this.me, you: this.you, capture: this.capture}), (err) => {
      //this.thinker.stdin.write('[CLIENT] Players written!')
      if(err){
        console.log('[CLIENT] Could not write players.json');
      }
    });
  }



  set(key, value){
    if(key === 'GAME_ID'){
      console.log(value);
      this.gameId = value;
    }
    if(key === 'PLAYER_ID'){
      this.playerId = value;
    }
  }
}

class Thinker {
  constructor() {
    this.me = -1;
    this.you = -1;
    this.capture = -1;

    this.state = 0;

    this.emptyFields = [];
    this.ownFields = [];
    this.enemyFields = [];
    this.ownAvailablePieces = [];

    this.calculatedMove = '';
  }

  read(key,path,fn){
    if(key === 'PIECES'){
      this.emptyFields = ['A0', 'B0', 'C0', 'A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3', 'A4', 'B4', 'C4', 'A5', 'B5', 'C5', 'A6', 'B6', 'C6', 'A7', 'B7', 'C7'];
      this.ownFields = [];
      this.ownAvailablePieces = [];
      this.enemyFields = [];
      return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8' ,(err, data) => {
          if(!err){
            var pieces = JSON.parse(data);
            resolve(pieces);
          }
          else {
            reject(err);
          }
        });
      });
    }
    if(key === 'PLAYERS'){
      return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8' ,(err, data) => {
          if(!err){
            var players = JSON.parse(data);
            this.me = players.me;
            this.you = players.you;
            this.capture = players.capture;
            resolve();
          }
          else {
            reject(err);
          }
        });
      });
    }
  }

  checkState(){
    if(this.ownAvailablePieces.length > 0){
      this.state = 0;
    }
    else if(this.ownFields.length > 3){
      this.state = 1;
    }
    else if(this.ownFields.length === 3){
      this.state = 2;
    }
  }

  getRandomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
 }

 getRandomOwnFieldWithFreeNeighbor(){
   var fieldsWithNeighbors = [];
   for(let field of this.ownFields){
     if(field[0] === 'A'){

       if((+field[1]) % 2 == 0){
         if((+field[1])-1 === -1 && this.emptyFields.indexOf('A7') != -1){
           fieldsWithNeighbors.push(field+':A7');
         }
         if(this.emptyFields.indexOf('A' + (+field[1]+1)) != -1){
           fieldsWithNeighbors.push(field+':A' + (+field[1]+1));
         }
         if(this.emptyFields.indexOf('A' + (+field[1]-1)) != -1){
           fieldsWithNeighbors.push(field+':A' + (+field[1]-1));
         }
       }
       else {

         if((+field[1])+1 === 8 && this.emptyFields.indexOf('A0') != -1){
           fieldsWithNeighbors.push(field+':A0');
         }
         if(this.emptyFields.indexOf('A' + (+field[1]+1)) != -1){
           fieldsWithNeighbors.push(field+':A' + (+field[1]+1));
         }
         if(this.emptyFields.indexOf('A' + (+field[1]-1)) != -1){
           fieldsWithNeighbors.push(field+':A' + (+field[1]-1));
         }


       }

     }

     else if(field[0] === 'B'){

       if((+field[1]) % 2 == 0){
         if((+field[1])-1 === -1 && this.emptyFields.indexOf('B7') != -1){
           fieldsWithNeighbors.push(field+':B7');
         }
         if(this.emptyFields.indexOf('B' + (+field[1]+1)) != -1){
           fieldsWithNeighbors.push(field+':B' + (+field[1]+1));
         }
         if(this.emptyFields.indexOf('B' + (+field[1]-1)) != -1){
           fieldsWithNeighbors.push(field+':B' + (+field[1]-1));
         }
       }
       else {

         if((+field[1])+1 === 8 && this.emptyFields.indexOf('B0') != -1){
           fieldsWithNeighbors.push(field+':B0');
         }
         if(this.emptyFields.indexOf('B' + (+field[1]+1)) != -1){
           fieldsWithNeighbors.push(field+':B' + (+field[1]+1));
         }
         if(this.emptyFields.indexOf('B' + (+field[1]-1)) != -1){
           fieldsWithNeighbors.push(field+':B' + (+field[1]-1));
         }
         if(this.emptyFields.indexOf('A' + (+field[1])) != -1){
           fieldsWithNeighbors.push(field+':A' + (+field[1]));
         }
         if(this.emptyFields.indexOf('C' + (+field[1])) != -1){
           fieldsWithNeighbors.push(field+':C' + (+field[1]));
         }

       }

     }

     else if(field[0] === 'C'){

       if((+field[1]) % 2 == 0){
         if((+field[1])-1 === -1 && this.emptyFields.indexOf('C7') != -1){
           fieldsWithNeighbors.push(field+':C7');
         }
         if(this.emptyFields.indexOf('C' + (+field[1]+1)) != -1){
           fieldsWithNeighbors.push(field+':C' + (+field[1]+1));
         }
         if(this.emptyFields.indexOf('C' + (+field[1]-1)) != -1){
           fieldsWithNeighbors.push(field+':C' + (+field[1]-1));
         }
       }
       else {

         if((+field[1])+1 === 8 && this.emptyFields.indexOf('C0') != -1){
           fieldsWithNeighbors.push(field+':C0');
         }
         if(this.emptyFields.indexOf('C' + (+field[1]+1)) != -1){
           fieldsWithNeighbors.push(field+':C' + (+field[1]+1));
         }
         if(this.emptyFields.indexOf('C' + (+field[1]-1)) != -1){
           fieldsWithNeighbors.push(field+':C' + (+field[1]-1));
         }
         if(this.emptyFields.indexOf('B' + (+field[1])) != -1){
           fieldsWithNeighbors.push(field+':B' + (+field[1]));
         }

       }

     }

   }

   let random = this.getRandomNumber(0, fieldsWithNeighbors.length-1);

   return fieldsWithNeighbors[random];
 }

  calculateMove(pieces){
    console.log('PIECES WRITTEN');
    for(let piece of pieces){

      if(piece.position.length == 1){
        if(piece.playerId == this.me && piece.position[0] == 'A'){
            this.ownAvailablePieces.push(piece.position);
        }
      }

      if(piece.position.length != 1){
        console.log('[THINKER] PLAYERID ' + piece.playerId);
        console.log('[THINKER] MEID ' + this.me);
        if(this.emptyFields.indexOf(piece.position) != -1){
          this.emptyFields.splice(this.emptyFields.indexOf(piece.position), 1);
        }
        if(piece.playerId == this.me){
          console.log('[THINKER] OWN PIECE ' + piece.position);
          this.ownFields.push(piece.position);
        }
        if(piece.playerId == this.you){
          this.enemyFields.push(piece.position);
        }
      }
    }

    console.log('[THINKER] Empty: ' + this.emptyFields);
    console.log('[THINKER] Own: ' + this.ownFields);

    // Move
    if(this.capture === 0){
      this.checkState();

      let random = this.getRandomNumber(0, this.emptyFields.length-1);

      if(this.state === 0){
        this.calculatedMove = '[THINKER] MOVE ' + this.emptyFields[random];
      }

      if(this.state === 1){
        this.calculatedMove = '[THINKER] MOVE ' + this.getRandomOwnFieldWithFreeNeighbor();
      }

      if(this.state === 2){
        let random1 = this.getRandomNumber(0, this.ownFields.length-1);
        let random2 = this.getRandomNumber(0, this.emptyFields.length-1);
        this.calculatedMove = '[THINKER] MOVE ' + this.ownFields[random1] + ':' + this.emptyFields[random2];
      }
    }

    //Capture
    else {
      while(this.capture > 0){
        let random = this.getRandomNumber(0, this.enemyFields.length-1);
        this.calculatedMove = '[THINKER] MOVE ' + this.enemyFields[random];
        this.capture--;
      }
    }

  }

  getMove(){
    console.log(this.calculatedMove);
  }

}

  exports.ProtocolHandler = ProtocolHandler;
  exports.Thinker = Thinker;

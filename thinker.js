const Thinker = require('./resources/handlers').Thinker;
const thinker = new Thinker();

process.stdin.on('data', (data) => {
  if(data.toString() === '[CLIENT] Pieces written!'){
    thinker.read('PIECES','./pieces.json')
           .then(pieces => {
             thinker.read('PLAYERS','./players.json')
                    .then(() => {
                      console.log('PIECES ' + pieces);
                      thinker.calculateMove(pieces);
                    });
           });
  }
  if(data.toString() === '[CLIENT] RETURN MOVE'){
    thinker.getMove();
  }
});

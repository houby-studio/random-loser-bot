var express = require('express')
var router = express.Router()
var axios = require('axios')

// When started in automatic play mode, obtains new game token and starts play loop.
function startMatchmaking (req, _userId, _userToken) {
  // If set to infinite playing, start another matchmaking.
  if (req.body.infinite == "1") {
    setTimeout(function () { startMatchmaking(req, _userId, _userToken) }, 10000)
  }
  axios.post('https://piskvorky.jobs.cz/api/v1/connect', {
    userToken: req.session.botUserToken
  }).then((response) => {
    console.log('Obtained new game token: ' + response.data.gameToken)
    req.session.gameToken = response.data.gameToken
    // Setup separate variables for loophole to ensure it doesn't change while playing.
    var _gameId = response.data.gameToken
    play(_userId, _userToken, _gameId, response)
  }).catch((error) => {
    console.log('Failed to start new game.')
  })
}

// Play loop which handles game in automatic play mode. When it detects it is our turn, it starts tryMove loop.
function play (_userId, _userToken, _gameId, response) {
  setTimeout(function () {  // Try to play every 5 seconds
    console.log('Obtaining last status game status after 5 seconds.')
    axios.post('https://piskvorky.jobs.cz/api/v1/checkLastStatus', {
      userToken: _userToken,
      gameToken: _gameId
    }).then((response) => {
      console.log('Obtained response.')
      // Check if game has ended
      if (response.data.winnerId) {
        if (response.data.winnerId == _userId) {
          console.log('Winner is already declared and to our surprise, it is you!')
        } else {
          console.log('Winner is already declared and you are the loser.')
        }
      }
      // If we are playing, try random number around last number.
      else if (response.data.actualPlayerId == _userId) {
        setTimeout(function () { tryMove(_userId, _userToken, _gameId, response); }, 2000);
        play(_userId, _userToken, _gameId, response)
      }
      // We are not playing, let's play again after couple seconds
      else {
        console.log('Not playing right now. Current player: ' + response.data.actualPlayerId + ' vs our bot: ' + _userId)
        play(_userId, _userToken, _gameId, response)
      }
    }).catch((error) => {
      console.log('Error occured when checking for last status')
      play(_userId, _userToken, _gameId, response)
    })
  }, 5000)
}

// Obtains last coordinates and tries to randomly place piece around it.
function tryMove (_userId, _userToken, _gameId, response) {
  // Get last coordinates and try to set next move next to it
  try {
    var previousX = response.data.coordinates[0].x
    var previousY = response.data.coordinates[0].y
  } catch {
    var previousX = 0
    var previousY = 0
  }
  _randX = Math.random()
  if (_randX < 0.33) {
    _x = previousX + 1
  } else if (_randX > 0.66) {
    _x = previousX - 1
  } else {
    _x = previousX
  }
  _randY = Math.random()
  if (_randY < 0.33) {
    _y = previousY + 1
  } else if (_randY > 0.66) {
    _y = previousY - 1
  } else {
    _y = previousY
  }
  console.log('Previous movement x: ' + previousX + ' y: ' + previousY + '\nAttempting to move with movement x: ' + _x + ' y: ' + _y)
  axios.post('https://piskvorky.jobs.cz/api/v1/play', {
    userToken: _userToken,
    gameToken: _gameId,
    positionX: _x,
    positionY: _y
  }).then((response) => {
    console.log('Movement has been accepted!')
  }).catch((error) => {
    console.log('Error occured when attempting to post new value')
    setTimeout(function () { tryMove(_userId, _userToken, _gameId, response); }, 2000);
  })
}

/* GET play page. */
router.get('/', function (req, res, next) {
  res.render('play', { title: 'Play @ Random Loser Bot', session: req.session })
});

/* POST play page. Start new game, get game status, play your move. */
router.post('/', function (req, res, next) {
  // Send request with your bot token to endpoint to obtain new game token.
  if (req.body.newgame) {
    console.log('Starting new game')
    axios.post('https://piskvorky.jobs.cz/api/v1/connect', {
      userToken: req.session.botUserToken
    }).then((response) => {
      console.log('Obtained new game token')
      req.session.gameToken = response.data.gameToken
      res.render('play', { title: 'Play @ Random Loser Bot', session: req.session, gameStarted: true })
    }).catch((error) => {
      res.send('We are very sorry, an error occured when starting new game.<br>Response from API: ' + error + '<br><a href="/play">Return to Play form</a>')
    })
  }
  // Send request with your bot token and game token to obtain status of the game.
  else if (req.body.getstatus) {
    console.log('Getting status')
    axios.post('https://piskvorky.jobs.cz/api/v1/checkStatus', {
      userToken: req.session.botUserToken,
      gameToken: req.session.gameToken
    }).then((response) => {
      console.log(response.data.coordinates)
      res.render('play', { title: 'Play @ Random Loser Bot', session: req.session, statusFetched: response.data })
    }).catch((error) => {
      res.send('We are very sorry, an error occured when checking game status.<br>Response from API: ' + error + '<br><a href="/play">Return to Play form</a>')
    })
  }
  else if (req.body.playmove) {
    console.log('Playing move')
    axios.post('https://piskvorky.jobs.cz/api/v1/play', {
      userToken: req.session.botUserToken,
      gameToken: req.session.gameToken,
      positionX: parseInt(req.body.positionX),
      positionY: parseInt(req.body.positionY)
    }).then((response) => {
      console.log(response)
      res.render('play', { title: 'Play @ Random Loser Bot', session: req.session, movePlayed: response.data })
    }).catch((error) => {
      res.send('We are very sorry, an error occured when sending player move.<br>Response from API: ' + error + '<br><a href="/play">Return to Play form</a>')
    })
  }
  else if (req.body.botplay) {
    console.log('Bot starts automatically playing')
    // Start match making.
    var _userId = req.session.botUserId
    var _userToken = req.session.botUserToken
    startMatchmaking(req, _userId, _userToken)
    res.status(202).send('Game has started. You can check status on play page.<br><a href="/play">Return to Play form</a>')
  }
});

module.exports = router;

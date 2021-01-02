var express = require('express')
var router = express.Router()
var axios = require('axios')

/* GET registration page. */
router.get('/', function (req, res, next) {
  res.render('register', { title: 'Register @ Random Loser Bot', session: req.session })
})

/* POST registration page. Submit form to register new bot. */
router.post('/', function (req, res, next) {
  axios.post('https://piskvorky.jobs.cz/api/v1/user', {
    nickname: req.body.nickname,
    email: req.body.email
  }).then((response) => {
    req.session.botNickname = req.body.nickname
    req.session.botEmail = req.body.email
    req.session.botUserId = response.data.userId
    req.session.botUserToken = response.data.userToken
    res.send('Succesfully registered.<br>User Id: ' + response.data.userId + '<br>User Token: ' + response.data.userToken + '<br><a href="/register">Return to Registration form</a>')
  }).catch((error) => {
    res.send('We are very sorry, an error occured during bot registration.<br>Response from API: ' + error + '<br><a href="/register">Return to Registration form</a>')
  })
})

module.exports = router

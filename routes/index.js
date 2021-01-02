var express = require('express')
var router = express.Router()

/* GET home page. */
router.get('/', function (req, res, next) {
  console.log('Loading Index page.')
  res.render('index', { title: 'Random Loser Bot' })
})

module.exports = router

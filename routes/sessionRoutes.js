const express = require('express')
const router = express.Router()
const { setTrackState } = require('../controllers/sessionController.js')

router.route('/').put(setTrackState)

module.exports = router
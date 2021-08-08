const Router = require('express')
const { getURL } = require('@api/routes.config.js')

const router = Router()
router.use(getURL('oauth.discord'), require('./discord.route'))

module.exports = router

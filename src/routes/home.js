/**
 * @file routes/home.js
 * @description Page routes that render HTML views.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const express = require('express');
const { getHome, getLegacyHome, getAbout, getAuditPage } = require('../controllers/homeController');

const router = express.Router();
router.get('/', getHome);
router.get('/audit', getAuditPage);
router.get('/about', getAbout);
router.get('/home', getLegacyHome);

module.exports = router;

/**
 * @file routes/home.js
 * @description Page routes that render HTML views.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const express = require('express');
const { getHome, getAbout, getAuditPage } = require('../controllers/homeController');

const router = express.Router();
router.get('/', getHome);
router.get('/about', getAbout);
router.get('/audit', getAuditPage);

module.exports = router;

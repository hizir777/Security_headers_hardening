/**
 * @file routes/health.js
 * @description Health and audit JSON endpoints.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const express = require('express');
const { getLiveness, getReadiness } = require('../controllers/healthController');

const router = express.Router();
router.get('/healthz', getLiveness);
router.get('/readyz', getReadiness);

module.exports = router;

/**
 * @file routes/index.js
 * @description Aggregates and mounts all sub-routers. Exposed as a single
 *              middleware that app.js attaches at the application root.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const express = require('express');
const homeRouter = require('./home');
const healthRouter = require('./health');
const cspReportRouter = require('./csp-report');
const externalAuditRouter = require('./external-audit');

const router = express.Router();
router.use('/', homeRouter);
router.use('/', healthRouter);
router.use('/', cspReportRouter);
router.use('/', externalAuditRouter);

module.exports = router;

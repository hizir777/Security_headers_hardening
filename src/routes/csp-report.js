/**
 * @file routes/csp-report.js
 * @description CSP violation receiver. Mounted with a JSON body parser
 *              that accepts both application/json and the legacy
 *              application/csp-report content type.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const express = require('express');
const { postCspReport } = require('../controllers/reportController');

const router = express.Router();

router.post(
  '/csp-report',
  express.json({ type: ['application/json', 'application/csp-report'] }),
  postCspReport,
);

module.exports = router;

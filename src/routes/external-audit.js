/**
 * @file routes/external-audit.js
 * @description Mounts the external-audit proxy endpoint. Accepts JSON body
 *              { url } and responds with graded findings the /audit page renders.
 * @author Istinye University - Secure Web Development
 */

'use strict';

const express = require('express');
const { postExternalAudit } = require('../controllers/externalAuditController');

const router = express.Router();

router.post(
  '/audit/external',
  express.json({ limit: '2kb' }),
  postExternalAudit,
);

module.exports = router;

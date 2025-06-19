// routes/jurnalPenyesuaianRoutes.js
const express = require('express');
const router = express.Router();
const jurnalPenyesuaianController = require('../controllers/jurnalPenyesuaianController');

// Jurnal Penyesuaian routes (no authentication)
router.post('/', jurnalPenyesuaianController.createJurnalPenyesuaian);
router.get('/', jurnalPenyesuaianController.getAllJurnalPenyesuaian);
router.get('/:id', jurnalPenyesuaianController.getJurnalPenyesuaianById);
router.put('/:id', jurnalPenyesuaianController.updateJurnalPenyesuaian);
router.delete('/:id', jurnalPenyesuaianController.deleteJurnalPenyesuaian);

module.exports = router;

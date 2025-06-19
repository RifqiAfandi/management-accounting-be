// routes/jurnalUmumRoutes.js
const express = require('express');
const router = express.Router();
const jurnalUmumController = require('../controllers/jurnalUmumController');

// Jurnal Umum routes (no authentication)
router.post('/', jurnalUmumController.createJurnalUmum);
router.get('/', jurnalUmumController.getAllJurnalUmum);
router.get('/:id', jurnalUmumController.getJurnalUmumById);
router.put('/:id', jurnalUmumController.updateJurnalUmum);
router.delete('/:id', jurnalUmumController.deleteJurnalUmum);

module.exports = router;

// routes/akunRoutes.js
const express = require('express');
const router = express.Router();
const akunController = require('../controllers/akunController');

// Akun routes (no authentication)
router.post('/', akunController.createAkun);
router.get('/', akunController.getAllAkun);
router.get('/:nomor_akun', akunController.getAkunByNomorAkun);
router.put('/:nomor_akun', akunController.updateAkun);
router.delete('/:nomor_akun', akunController.deleteAkun);

module.exports = router;

// routes/buktiTransaksiRoutes.js
const express = require('express');
const router = express.Router();
const buktiTransaksiController = require('../controllers/buktiTransaksiController');

// Bukti Transaksi routes (no authentication)
router.post('/', buktiTransaksiController.createBuktiTransaksi);
router.get('/', buktiTransaksiController.getAllBuktiTransaksi);
router.get('/:no_bukti', buktiTransaksiController.getBuktiTransaksiByNoBukti);
router.put('/:no_bukti', buktiTransaksiController.updateBuktiTransaksi);
router.delete('/:no_bukti', buktiTransaksiController.deleteBuktiTransaksi);

module.exports = router;

// controllers/buktiTransaksiController.js
const { BuktiTransaksi } = require("../models");
const { Op } = require("sequelize");

const sendResponse = (res, statusCode, status, message, isSuccess, data = null) => {
  res.status(statusCode).json({
    status,
    message,
    isSuccess,
    data,
  });
};

/**
 * Creates a new transaction evidence (BuktiTransaksi).
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function createBuktiTransaksi(req, res) {
  try {
    const { no_bukti, tanggal_transaksi, deskripsi, referensi } = req.body;

    if (!no_bukti || !tanggal_transaksi) {
      return sendResponse(res, 400, "error", "No Bukti and Tanggal Transaksi are required.", false);
    }

    const existingBukti = await BuktiTransaksi.findOne({ where: { no_bukti } });
    if (existingBukti) {
      return sendResponse(res, 409, "error", "Transaction evidence number already exists.", false);
    }

    const newBuktiTransaksi = await BuktiTransaksi.create({
      no_bukti,
      tanggal_transaksi,
      deskripsi,
      referensi,
    });

    sendResponse(res, 201, "success", "Transaction evidence created successfully", true, { buktiTransaksi: newBuktiTransaksi });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return sendResponse(res, 400, "error", error.message, false);
    }
    sendResponse(res, 500, "error", error.message, false);
  }
}

/**
 * Retrieves all transaction evidences (BuktiTransaksi) with pagination and filtering.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function getAllBuktiTransaksi(req, res) {
  try {
    const { page = 1, limit = 10, search, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { no_bukti: { [Op.like]: `%${search}%` } },
        { deskripsi: { [Op.like]: `%${search}%` } },
        { referensi: { [Op.like]: `%${search}%` } },
      ];
    }
    if (startDate && endDate) {
      whereClause.tanggal_transaksi = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      whereClause.tanggal_transaksi = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.tanggal_transaksi = {
        [Op.lte]: new Date(endDate),
      };
    }

    const { count, rows } = await BuktiTransaksi.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["tanggal_transaksi", "DESC"], ["no_bukti", "ASC"]],
    });

    sendResponse(res, 200, "success", "Transaction evidences retrieved successfully", true, {
      buktiTransaksi: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    sendResponse(res, 500, "error", error.message, false);
  }
}

/**
 * Retrieves a single transaction evidence (BuktiTransaksi) by its no_bukti.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function getBuktiTransaksiByNoBukti(req, res) {
  try {
    const { no_bukti } = req.params;

    const buktiTransaksi = await BuktiTransaksi.findOne({ where: { no_bukti } });

    if (!buktiTransaksi) {
      return sendResponse(res, 404, "error", "Transaction evidence not found", false);
    }

    sendResponse(res, 200, "success", "Transaction evidence retrieved successfully", true, { buktiTransaksi });
  } catch (error) {
    sendResponse(res, 500, "error", error.message, false);
  }
}

/**
 * Updates an existing transaction evidence (BuktiTransaksi) by its no_bukti.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function updateBuktiTransaksi(req, res) {
  try {
    const { no_bukti } = req.params;
    const { tanggal_transaksi, deskripsi, referensi } = req.body;

    const buktiTransaksi = await BuktiTransaksi.findOne({ where: { no_bukti } });
    if (!buktiTransaksi) {
      return sendResponse(res, 404, "error", "Transaction evidence not found", false);
    }

    const updateData = {};
    if (tanggal_transaksi !== undefined) updateData.tanggal_transaksi = tanggal_transaksi;
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
    if (referensi !== undefined) updateData.referensi = referensi;

    await buktiTransaksi.update(updateData);

    sendResponse(res, 200, "success", "Transaction evidence updated successfully", true, { buktiTransaksi });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return sendResponse(res, 400, "error", error.message, false);
    }
    sendResponse(res, 500, "error", error.message, false);
  }
}

/**
 * Deletes a transaction evidence (BuktiTransaksi) by its no_bukti.
 * IMPORTANT: Consider if this should cascade delete associated JurnalUmum entries,
 * or prevent deletion if there are associated journal entries.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function deleteBuktiTransaksi(req, res) {
  try {
    const { no_bukti } = req.params;

    const buktiTransaksi = await BuktiTransaksi.findOne({ where: { no_bukti } });
    if (!buktiTransaksi) {
      return sendResponse(res, 404, "error", "Transaction evidence not found", false);
    }

    // Add a check for associated JurnalUmum entries if you want to prevent deletion
    // const associatedJurnalUmum = await JurnalUmum.count({ where: { BuktiTransaksinoBukti: no_bukti } });
    // if (associatedJurnalUmum > 0) {
    //   return sendResponse(res, 400, "error", "Cannot delete. Associated journal entries exist.", false);
    // }

    await buktiTransaksi.destroy();

    sendResponse(res, 200, "success", "Transaction evidence deleted successfully", true, { deletedBuktiTransaksi: buktiTransaksi });
  } catch (error) {
    sendResponse(res, 500, "error", error.message, false);
  }
}

module.exports = {
  createBuktiTransaksi,
  getAllBuktiTransaksi,
  getBuktiTransaksiByNoBukti,
  updateBuktiTransaksi,
  deleteBuktiTransaksi,
};

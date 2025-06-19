// controllers/akunController.js
const { Akun } = require("../models");
const { Op } = require("sequelize");

// Helper for standardized response
const sendResponse = (res, statusCode, status, message, isSuccess, data = null) => {
  res.status(statusCode).json({
    status,
    message,
    isSuccess,
    data,
  });
};

/**
 * Creates a new account (Akun).
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function createAkun(req, res) {
  try {
    const { nomor_akun, nama_akun, kelompok_akun, posisi_saldo_normal } = req.body;

    // Validate required fields
    if (!nomor_akun || !nama_akun || !kelompok_akun || !posisi_saldo_normal) {
      return sendResponse(res, 400, "error", "All fields are required.", false);
    }

    // Check if account number already exists
    const existingAkun = await Akun.findOne({ where: { nomor_akun } });
    if (existingAkun) {
      return sendResponse(res, 409, "error", "Account number already exists.", false);
    }

    const newAkun = await Akun.create({
      nomor_akun,
      nama_akun,
      kelompok_akun,
      posisi_saldo_normal,
    });

    sendResponse(res, 201, "success", "Account created successfully", true, { akun: newAkun });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return sendResponse(res, 400, "error", error.message, false);
    }
    sendResponse(res, 500, "error", error.message, false);
  }
}

/**
 * Retrieves all accounts (Akun) with pagination and filtering.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function getAllAkun(req, res) {
  try {
    const { page = 1, limit = 10, search, kelompok_akun } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { nomor_akun: { [Op.like]: `%${search}%` } },
        { nama_akun: { [Op.like]: `%${search}%` } },
      ];
    }
    if (kelompok_akun) {
      whereClause.kelompok_akun = kelompok_akun;
    }

    const { count, rows } = await Akun.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["nomor_akun", "ASC"]],
    });

    sendResponse(res, 200, "success", "Accounts retrieved successfully", true, {
      akun: rows,
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
 * Retrieves a single account (Akun) by its nomor_akun.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function getAkunByNomorAkun(req, res) {
  try {
    const { nomor_akun } = req.params;

    const akun = await Akun.findOne({ where: { nomor_akun } });

    if (!akun) {
      return sendResponse(res, 404, "error", "Account not found", false);
    }

    sendResponse(res, 200, "success", "Account retrieved successfully", true, { akun });
  } catch (error) {
    sendResponse(res, 500, "error", error.message, false);
  }
}

/**
 * Updates an existing account (Akun) by its nomor_akun.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function updateAkun(req, res) {
  try {
    const { nomor_akun } = req.params;
    const { nama_akun, kelompok_akun, posisi_saldo_normal } = req.body;

    const akun = await Akun.findOne({ where: { nomor_akun } });
    if (!akun) {
      return sendResponse(res, 404, "error", "Account not found", false);
    }

    const updateData = {};
    if (nama_akun !== undefined) updateData.nama_akun = nama_akun;
    if (kelompok_akun !== undefined) updateData.kelompok_akun = kelompok_akun;
    if (posisi_saldo_normal !== undefined) updateData.posisi_saldo_normal = posisi_saldo_normal;

    await akun.update(updateData);

    sendResponse(res, 200, "success", "Account updated successfully", true, { akun });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return sendResponse(res, 400, "error", error.message, false);
    }
    sendResponse(res, 500, "error", error.message, false);
  }
}

/**
 * Deletes an account (Akun) by its nomor_akun.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function deleteAkun(req, res) {
  try {
    const { nomor_akun } = req.params;

    const akun = await Akun.findOne({ where: { nomor_akun } });
    if (!akun) {
      return sendResponse(res, 404, "error", "Account not found", false);
    }

    // Consider checking for dependent records (e.g., in JurnalUmum/JurnalPenyesuaian)
    // before allowing deletion, or set up CASCADE DELETE in your model associations.
    await akun.destroy();

    sendResponse(res, 200, "success", "Account deleted successfully", true, { deletedAkun: akun });
  } catch (error) {
    sendResponse(res, 500, "error", error.message, false);
  }
}

module.exports = {
  createAkun,
  getAllAkun,
  getAkunByNomorAkun,
  updateAkun,
  deleteAkun,
};

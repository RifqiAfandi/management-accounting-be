// controllers/jurnalUmumController.js
const { JurnalUmum, DetailJurnal, Akun, BuktiTransaksi, sequelize } = require("../models");
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
 * Creates a new General Journal entry, including its detail lines.
 * Requires the request body to contain:
 * {
 * tanggal: "YYYY-MM-DD",
 * deskripsi_transaksi: "Some description",
 * BuktiTransaksinoBukti: "BT001", // Optional, but highly recommended if exists
 * detail_jurnal: [
 * { nomor_akun: "101", debet: 100000, kredit: 0 },
 * { nomor_akun: "401", debet: 0, kredit: 100000 }
 * ]
 * }
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function createJurnalUmum(req, res) {
  const t = await sequelize.transaction(); // Start a transaction
  try {
    const { tanggal, deskripsi_transaksi, BuktiTransaksinoBukti, detail_jurnal } = req.body;

    // 1. Basic Validation
    if (!tanggal || !deskripsi_transaksi || !detail_jurnal || detail_jurnal.length < 2) {
      await t.rollback();
      return sendResponse(res, 400, "error", "Tanggal, Deskripsi Transaksi, and at least two Detail Jurnal entries are required.", false);
    }

    // 2. Validate Bukti Transaksi (if provided)
    if (BuktiTransaksinoBukti) {
      const buktiExists = await BuktiTransaksi.findOne({ where: { no_bukti: BuktiTransaksinoBukti }, transaction: t });
      if (!buktiExists) {
        await t.rollback();
        return sendResponse(res, 400, "error", `Bukti Transaksi with number '${BuktiTransaksinoBukti}' not found.`, false);
      }
    }

    // 3. Validate Detail Jurnal entries and balance
    let totalDebet = 0;
    let totalKredit = 0;
    const accountNumbers = new Set();

    for (const detail of detail_jurnal) {
      if (!detail.nomor_akun || (detail.debet === undefined && detail.kredit === undefined)) {
        await t.rollback();
        return sendResponse(res, 400, "error", "Each detail journal entry must have nomor_akun and either debet or kredit.", false);
      }
      if (typeof detail.debet !== 'number' || typeof detail.kredit !== 'number' || detail.debet < 0 || detail.kredit < 0) {
        await t.rollback();
        return sendResponse(res, 400, "error", "Debet and Kredit amounts must be non-negative numbers.", false);
      }

      accountNumbers.add(detail.nomor_akun);
      totalDebet += detail.debet || 0;
      totalKredit += detail.kredit || 0;
    }

    if (Math.abs(totalDebet - totalKredit) > 0.01) { // Allow for tiny floating point inaccuracies
      await t.rollback();
      return sendResponse(res, 400, "error", `Total Debet (${totalDebet}) does not equal Total Kredit (${totalKredit}).`, false);
    }

    // 4. Validate all account numbers exist
    const existingAkun = await Akun.findAll({
      where: { nomor_akun: { [Op.in]: Array.from(accountNumbers) } },
      transaction: t,
      attributes: ['nomor_akun'] // Only fetch the primary key for efficiency
    });

    const foundAkunNumbers = new Set(existingAkun.map(a => a.nomor_akun));
    const missingAkunNumbers = Array.from(accountNumbers).filter(num => !foundAkunNumbers.has(num));

    if (missingAkunNumbers.length > 0) {
      await t.rollback();
      return sendResponse(res, 400, "error", `Account numbers not found: ${missingAkunNumbers.join(', ')}.`, false);
    }

    // 5. Create JurnalUmum header
    const newJurnalUmum = await JurnalUmum.create({
      tanggal,
      deskripsi_transaksi,
      BuktiTransaksinoBukti: BuktiTransaksinoBukti || null, // Ensure it's null if not provided
    }, { transaction: t });

    // 6. Prepare DetailJurnal entries
    const detailJurnalEntries = detail_jurnal.map(detail => ({
      JurnalUmumId: newJurnalUmum.id,
      AkunNomorAkun: detail.nomor_akun,
      debet: detail.debet,
      kredit: detail.kredit,
    }));

    // 7. Create DetailJurnal entries in bulk
    await DetailJurnal.bulkCreate(detailJurnalEntries, { transaction: t });

    // Commit the transaction if all operations are successful
    await t.commit();

    // Fetch the created journal with details for the response
    const createdJurnalUmum = await JurnalUmum.findByPk(newJurnalUmum.id, {
      include: [
        { model: DetailJurnal, as: 'detailJurnals', include: { model: Akun, as: 'akun' } },
        { model: BuktiTransaksi, as: 'buktiTransaksi' }
      ]
    });

    sendResponse(res, 201, "success", "General Journal entry created successfully", true, { jurnalUmum: createdJurnalUmum });
  } catch (error) {
    await t.rollback(); // Rollback transaction on error
    console.error("Error creating Jurnal Umum:", error); // Log the full error
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeForeignKeyConstraintError") {
      return sendResponse(res, 400, "error", error.message, false);
    }
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

/**
 * Retrieves all General Journal entries with pagination and filtering.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function getAllJurnalUmum(req, res) {
  try {
    const { page = 1, limit = 10, search, startDate, endDate, nomor_akun } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.tanggal = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      whereClause.tanggal = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.tanggal = {
        [Op.lte]: new Date(endDate),
      };
    }
    if (search) {
      whereClause.deskripsi_transaksi = { [Op.like]: `%${search}%` };
    }

    const includeOptions = [
      {
        model: DetailJurnal,
        as: 'detailJurnals',
        include: {
          model: Akun,
          as: 'akun',
          attributes: ['nomor_akun', 'nama_akun', 'kelompok_akun'],
        },
        required: nomor_akun ? true : false, // Only require if filtering by akun
        where: nomor_akun ? { AkunNomorAkun: nomor_akun } : {},
      },
      {
        model: BuktiTransaksi,
        as: 'buktiTransaksi',
        attributes: ['no_bukti', 'tanggal_transaksi', 'deskripsi', 'referensi'],
      }
    ];

    const { count, rows } = await JurnalUmum.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ["tanggal", "DESC"],
        ["createdAt", "DESC"],
        [{ model: DetailJurnal, as: 'detailJurnals' }, 'id', 'ASC'] // Order detail lines
      ],
      distinct: true, // Crucial for correct pagination with includes
      col: 'id' // Specify the column for counting distinct primary keys
    });

    sendResponse(res, 200, "success", "General Journal entries retrieved successfully", true, {
      jurnalUmum: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all Jurnal Umum:", error);
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

/**
 * Retrieves a single General Journal entry by ID, including its detail lines.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function getJurnalUmumById(req, res) {
  try {
    const { id } = req.params;

    const jurnalUmum = await JurnalUmum.findByPk(id, {
      include: [
        { model: DetailJurnal, as: 'detailJurnals', include: { model: Akun, as: 'akun' } },
        { model: BuktiTransaksi, as: 'buktiTransaksi' }
      ]
    });

    if (!jurnalUmum) {
      return sendResponse(res, 404, "error", "General Journal entry not found", false);
    }

    sendResponse(res, 200, "success", "General Journal entry retrieved successfully", true, { jurnalUmum });
  } catch (error) {
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

/**
 * Updates a General Journal entry and its detail lines.
 * This function will delete existing details and create new ones.
 * Requires the request body to contain:
 * {
 * tanggal: "YYYY-MM-DD",
 * deskripsi_transaksi: "Some description",
 * BuktiTransaksinoBukti: "BT001", // Optional
 * detail_jurnal: [
 * { nomor_akun: "101", debet: 100000, kredit: 0 },
 * { nomor_akun: "401", debet: 0, kredit: 100000 }
 * ]
 * }
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function updateJurnalUmum(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { tanggal, deskripsi_transaksi, BuktiTransaksinoBukti, detail_jurnal } = req.body;

    const jurnalUmum = await JurnalUmum.findByPk(id, { transaction: t });
    if (!jurnalUmum) {
      await t.rollback();
      return sendResponse(res, 404, "error", "General Journal entry not found", false);
    }

    // 1. Basic Validation for new details
    if (!detail_jurnal || detail_jurnal.length < 2) {
      await t.rollback();
      return sendResponse(res, 400, "error", "At least two Detail Jurnal entries are required for update.", false);
    }

    // 2. Validate Bukti Transaksi (if provided and changed)
    if (BuktiTransaksinoBukti && BuktiTransaksinoBukti !== jurnalUmum.BuktiTransaksinoBukti) {
      const buktiExists = await BuktiTransaksi.findOne({ where: { no_bukti: BuktiTransaksinoBukti }, transaction: t });
      if (!buktiExists) {
        await t.rollback();
        return sendResponse(res, 400, "error", `Bukti Transaksi with number '${BuktiTransaksinoBukti}' not found.`, false);
      }
    }

    // 3. Validate new Detail Jurnal entries and balance
    let totalDebet = 0;
    let totalKredit = 0;
    const accountNumbers = new Set();

    for (const detail of detail_jurnal) {
      if (!detail.nomor_akun || (detail.debet === undefined && detail.kredit === undefined)) {
        await t.rollback();
        return sendResponse(res, 400, "error", "Each detail journal entry must have nomor_akun and either debet or kredit.", false);
      }
      if (typeof detail.debet !== 'number' || typeof detail.kredit !== 'number' || detail.debet < 0 || detail.kredit < 0) {
        await t.rollback();
        return sendResponse(res, 400, "error", "Debet and Kredit amounts must be non-negative numbers.", false);
      }
      accountNumbers.add(detail.nomor_akun);
      totalDebet += detail.debet || 0;
      totalKredit += detail.kredit || 0;
    }

    if (Math.abs(totalDebet - totalKredit) > 0.01) {
      await t.rollback();
      return sendResponse(res, 400, "error", `Total Debet (${totalDebet}) does not equal Total Kredit (${totalKredit}).`, false);
    }

    // 4. Validate all account numbers exist for new details
    const existingAkun = await Akun.findAll({
      where: { nomor_akun: { [Op.in]: Array.from(accountNumbers) } },
      transaction: t,
      attributes: ['nomor_akun']
    });
    const foundAkunNumbers = new Set(existingAkun.map(a => a.nomor_akun));
    const missingAkunNumbers = Array.from(accountNumbers).filter(num => !foundAkunNumbers.has(num));
    if (missingAkunNumbers.length > 0) {
      await t.rollback();
      return sendResponse(res, 400, "error", `Account numbers not found in new details: ${missingAkunNumbers.join(', ')}.`, false);
    }

    // 5. Update JurnalUmum header
    const updateData = {};
    if (tanggal !== undefined) updateData.tanggal = tanggal;
    if (deskripsi_transaksi !== undefined) updateData.deskripsi_transaksi = deskripsi_transaksi;
    if (BuktiTransaksinoBukti !== undefined) updateData.BuktiTransaksinoBukti = BuktiTransaksinoBukti || null;

    await jurnalUmum.update(updateData, { transaction: t });

    // 6. Delete existing DetailJurnal entries for this JurnalUmum
    await DetailJurnal.destroy({ where: { JurnalUmumId: id }, transaction: t });

    // 7. Create new DetailJurnal entries
    const detailJurnalEntries = detail_jurnal.map(detail => ({
      JurnalUmumId: id,
      AkunNomorAkun: detail.nomor_akun,
      debet: detail.debet,
      kredit: detail.kredit,
    }));
    await DetailJurnal.bulkCreate(detailJurnalEntries, { transaction: t });

    await t.commit();

    const updatedJurnalUmum = await JurnalUmum.findByPk(id, {
      include: [
        { model: DetailJurnal, as: 'detailJurnals', include: { model: Akun, as: 'akun' } },
        { model: BuktiTransaksi, as: 'buktiTransaksi' }
      ]
    });

    sendResponse(res, 200, "success", "General Journal entry updated successfully", true, { jurnalUmum: updatedJurnalUmum });
  } catch (error) {
    await t.rollback();
    console.error("Error updating Jurnal Umum:", error);
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeForeignKeyConstraintError") {
      return sendResponse(res, 400, "error", error.message, false);
    }
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

/**
 * Deletes a General Journal entry and its associated detail lines.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function deleteJurnalUmum(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const jurnalUmum = await JurnalUmum.findByPk(id, { transaction: t });
    if (!jurnalUmum) {
      await t.rollback();
      return sendResponse(res, 404, "error", "General Journal entry not found", false);
    }

    // Delete associated detail entries first
    await DetailJurnal.destroy({ where: { JurnalUmumId: id }, transaction: t });

    // Then delete the header
    await jurnalUmum.destroy({ transaction: t });

    await t.commit();

    sendResponse(res, 200, "success", "General Journal entry deleted successfully", true, { deletedJurnalUmum: jurnalUmum });
  } catch (error) {
    await t.rollback();
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

module.exports = {
  createJurnalUmum,
  getAllJurnalUmum,
  getJurnalUmumById,
  updateJurnalUmum,
  deleteJurnalUmum,
};

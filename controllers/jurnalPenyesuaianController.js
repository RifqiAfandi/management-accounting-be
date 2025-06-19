// controllers/jurnalPenyesuaianController.js
const { JurnalPenyesuaian, DetailJurnalPenyesuaian, Akun, sequelize } = require("../models");
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
 * Creates a new Adjusting Journal entry, including its detail lines.
 * Requires the request body to contain:
 * {
 * tanggal: "YYYY-MM-DD",
 * no_bukti_penyesuaian: "ADJ001", // Optional
 * deskripsi_penyesuaian: "Adjusting entry for supplies",
 * detail_jurnal_penyesuaian: [
 * { nomor_akun: "601", debet: 50000, kredit: 0 },
 * { nomor_akun: "105", debet: 0, kredit: 50000 }
 * ]
 * }
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function createJurnalPenyesuaian(req, res) {
  const t = await sequelize.transaction();
  try {
    const { tanggal, no_bukti_penyesuaian, deskripsi_penyesuaian, detail_jurnal_penyesuaian } = req.body;

    // 1. Basic Validation
    if (!tanggal || !deskripsi_penyesuaian || !detail_jurnal_penyesuaian || detail_jurnal_penyesuaian.length < 2) {
      await t.rollback();
      return sendResponse(res, 400, "error", "Tanggal, Deskripsi Penyesuaian, and at least two Detail Jurnal Penyesuaian entries are required.", false);
    }

    // 2. Validate Detail Jurnal Penyesuaian entries and balance
    let totalDebet = 0;
    let totalKredit = 0;
    const accountNumbers = new Set();

    for (const detail of detail_jurnal_penyesuaian) {
      if (!detail.nomor_akun || (detail.debet === undefined && detail.kredit === undefined)) {
        await t.rollback();
        return sendResponse(res, 400, "error", "Each detail adjusting journal entry must have nomor_akun and either debet or kredit.", false);
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

    // 3. Validate all account numbers exist
    const existingAkun = await Akun.findAll({
      where: { nomor_akun: { [Op.in]: Array.from(accountNumbers) } },
      transaction: t,
      attributes: ['nomor_akun']
    });

    const foundAkunNumbers = new Set(existingAkun.map(a => a.nomor_akun));
    const missingAkunNumbers = Array.from(accountNumbers).filter(num => !foundAkunNumbers.has(num));

    if (missingAkunNumbers.length > 0) {
      await t.rollback();
      return sendResponse(res, 400, "error", `Account numbers not found: ${missingAkunNumbers.join(', ')}.`, false);
    }

    // 4. Create JurnalPenyesuaian header
    const newJurnalPenyesuaian = await JurnalPenyesuaian.create({
      tanggal,
      no_bukti_penyesuaian: no_bukti_penyesuaian || null,
      deskripsi_penyesuaian,
    }, { transaction: t });

    // 5. Prepare DetailJurnalPenyesuaian entries
    const detailJurnalPenyesuaianEntries = detail_jurnal_penyesuaian.map(detail => ({
      JurnalPenyesuaianId: newJurnalPenyesuaian.id,
      AkunNomorAkun: detail.nomor_akun,
      debet: detail.debet,
      kredit: detail.kredit,
    }));

    // 6. Create DetailJurnalPenyesuaian entries in bulk
    await DetailJurnalPenyesuaian.bulkCreate(detailJurnalPenyesuaianEntries, { transaction: t });

    await t.commit();

    const createdJurnalPenyesuaian = await JurnalPenyesuaian.findByPk(newJurnalPenyesuaian.id, {
      include: [{ model: DetailJurnalPenyesuaian, as: 'detailJurnalPenyesuaians', include: { model: Akun, as: 'akun' } }]
    });

    sendResponse(res, 201, "success", "Adjusting Journal entry created successfully", true, { jurnalPenyesuaian: createdJurnalPenyesuaian });
  } catch (error) {
    await t.rollback();
    console.error("Error creating Jurnal Penyesuaian:", error);
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeForeignKeyConstraintError") {
      return sendResponse(res, 400, "error", error.message, false);
    }
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

/**
 * Retrieves all Adjusting Journal entries with pagination and filtering.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function getAllJurnalPenyesuaian(req, res) {
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
      whereClause.deskripsi_penyesuaian = { [Op.like]: `%${search}%` };
    }

    const includeOptions = [
      {
        model: DetailJurnalPenyesuaian,
        as: 'detailJurnalPenyesuaians',
        include: {
          model: Akun,
          as: 'akun',
          attributes: ['nomor_akun', 'nama_akun', 'kelompok_akun'],
        },
        required: nomor_akun ? true : false,
        where: nomor_akun ? { AkunNomorAkun: nomor_akun } : {},
      }
    ];

    const { count, rows } = await JurnalPenyesuaian.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ["tanggal", "DESC"],
        ["createdAt", "DESC"],
        [{ model: DetailJurnalPenyesuaian, as: 'detailJurnalPenyesuaians' }, 'id', 'ASC']
      ],
      distinct: true,
      col: 'id'
    });

    sendResponse(res, 200, "success", "Adjusting Journal entries retrieved successfully", true, {
      jurnalPenyesuaian: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all Jurnal Penyesuaian:", error);
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

/**
 * Retrieves a single Adjusting Journal entry by ID, including its detail lines.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function getJurnalPenyesuaianById(req, res) {
  try {
    const { id } = req.params;

    const jurnalPenyesuaian = await JurnalPenyesuaian.findByPk(id, {
      include: [{ model: DetailJurnalPenyesuaian, as: 'detailJurnalPenyesuaians', include: { model: Akun, as: 'akun' } }]
    });

    if (!jurnalPenyesuaian) {
      return sendResponse(res, 404, "error", "Adjusting Journal entry not found", false);
    }

    sendResponse(res, 200, "success", "Adjusting Journal entry retrieved successfully", true, { jurnalPenyesuaian });
  } catch (error) {
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

/**
 * Updates an Adjusting Journal entry and its detail lines.
 * This function will delete existing details and create new ones.
 * Requires the request body to contain:
 * {
 * tanggal: "YYYY-MM-DD",
 * no_bukti_penyesuaian: "ADJ001", // Optional
 * deskripsi_penyesuaian: "Adjusting entry for supplies",
 * detail_jurnal_penyesuaian: [
 * { nomor_akun: "601", debet: 50000, kredit: 0 },
 * { nomor_akun: "105", debet: 0, kredit: 50000 }
 * ]
 * }
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function updateJurnalPenyesuaian(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { tanggal, no_bukti_penyesuaian, deskripsi_penyesuaian, detail_jurnal_penyesuaian } = req.body;

    const jurnalPenyesuaian = await JurnalPenyesuaian.findByPk(id, { transaction: t });
    if (!jurnalPenyesuaian) {
      await t.rollback();
      return sendResponse(res, 404, "error", "Adjusting Journal entry not found", false);
    }

    // 1. Basic Validation for new details
    if (!detail_jurnal_penyesuaian || detail_jurnal_penyesuaian.length < 2) {
      await t.rollback();
      return sendResponse(res, 400, "error", "At least two Detail Jurnal Penyesuaian entries are required for update.", false);
    }

    // 2. Validate new Detail Jurnal Penyesuaian entries and balance
    let totalDebet = 0;
    let totalKredit = 0;
    const accountNumbers = new Set();

    for (const detail of detail_jurnal_penyesuaian) {
      if (!detail.nomor_akun || (detail.debet === undefined && detail.kredit === undefined)) {
        await t.rollback();
        return sendResponse(res, 400, "error", "Each detail adjusting journal entry must have nomor_akun and either debet or kredit.", false);
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

    // 3. Validate all account numbers exist for new details
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

    // 4. Update JurnalPenyesuaian header
    const updateData = {};
    if (tanggal !== undefined) updateData.tanggal = tanggal;
    if (no_bukti_penyesuaian !== undefined) updateData.no_bukti_penyesuaian = no_bukti_penyesuaian || null;
    if (deskripsi_penyesuaian !== undefined) updateData.deskripsi_penyesuaian = deskripsi_penyesuaian;

    await jurnalPenyesuaian.update(updateData, { transaction: t });

    // 5. Delete existing DetailJurnalPenyesuaian entries for this JurnalPenyesuaian
    await DetailJurnalPenyesuaian.destroy({ where: { JurnalPenyesuaianId: id }, transaction: t });

    // 6. Create new DetailJurnalPenyesuaian entries
    const detailJurnalPenyesuaianEntries = detail_jurnal_penyesuaian.map(detail => ({
      JurnalPenyesuaianId: id,
      AkunNomorAkun: detail.nomor_akun,
      debet: detail.debet,
      kredit: detail.kredit,
    }));
    await DetailJurnalPenyesuaian.bulkCreate(detailJurnalPenyesuaianEntries, { transaction: t });

    await t.commit();

    const updatedJurnalPenyesuaian = await JurnalPenyesuaian.findByPk(id, {
      include: [{ model: DetailJurnalPenyesuaian, as: 'detailJurnalPenyesuaians', include: { model: Akun, as: 'akun' } }]
    });

    sendResponse(res, 200, "success", "Adjusting Journal entry updated successfully", true, { jurnalPenyesuaian: updatedJurnalPenyesuaian });
  } catch (error) {
    await t.rollback();
    console.error("Error updating Jurnal Penyesuaian:", error);
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeForeignKeyConstraintError") {
      return sendResponse(res, 400, "error", error.message, false);
    }
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

/**
 * Deletes an Adjusting Journal entry and its associated detail lines.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function deleteJurnalPenyesuaian(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const jurnalPenyesuaian = await JurnalPenyesuaian.findByPk(id, { transaction: t });
    if (!jurnalPenyesuaian) {
      await t.rollback();
      return sendResponse(res, 404, "error", "Adjusting Journal entry not found", false);
    }

    // Delete associated detail entries first
    await DetailJurnalPenyesuaian.destroy({ where: { JurnalPenyesuaianId: id }, transaction: t });

    // Then delete the header
    await jurnalPenyesuaian.destroy({ transaction: t });

    await t.commit();

    sendResponse(res, 200, "success", "Adjusting Journal entry deleted successfully", true, { deletedJurnalPenyesuaian: jurnalPenyesuaian });
  } catch (error) {
    await t.rollback();
    sendResponse(res, 500, "error", `Internal server error: ${error.message}`, false);
  }
}

module.exports = {
  createJurnalPenyesuaian,
  getAllJurnalPenyesuaian,
  getJurnalPenyesuaianById,
  updateJurnalPenyesuaian,
  deleteJurnalPenyesuaian,
};

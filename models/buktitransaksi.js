'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BuktiTransaksi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  BuktiTransaksi.init({
    no_bukti: DataTypes.STRING,
    tanggal_transaksi: DataTypes.DATE,
    deskripsi: DataTypes.TEXT,
    referensi: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'BuktiTransaksi',
  });
  return BuktiTransaksi;
};
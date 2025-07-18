'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class JurnalUmum extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  JurnalUmum.init({
    tanggal: DataTypes.DATE,
    deskripsi_transaksi: DataTypes.TEXT,
    BuktiTransaksinoBukti: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'JurnalUmum',
  });
  return JurnalUmum;
};
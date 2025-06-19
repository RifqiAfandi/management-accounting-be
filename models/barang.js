'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Barang extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Barang.init({
    nama_barang: DataTypes.STRING,
    kategori: DataTypes.STRING,
    jumlah: DataTypes.INTEGER,
    satuan: DataTypes.STRING,
    harga_per_satuan: DataTypes.DECIMAL,
    tanggal_beli: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Barang',
  });
  return Barang;
};
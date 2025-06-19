'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Akun extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Akun.init({
    nomor_akun: DataTypes.STRING,
    nama_akun: DataTypes.STRING,
    kelompok_akun: DataTypes.STRING,
    posisi_saldo_normal: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Akun',
  });
  return Akun;
};
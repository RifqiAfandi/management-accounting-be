'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class JurnalPenyesuaian extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  JurnalPenyesuaian.init({
    tanggal: DataTypes.DATE,
    no_bukti_penyesuaian: DataTypes.STRING,
    deskripsi_penyesuaian: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'JurnalPenyesuaian',
  });
  return JurnalPenyesuaian;
};
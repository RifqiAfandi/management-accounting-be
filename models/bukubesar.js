'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BukuBesar extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  BukuBesar.init({
    akunId: DataTypes.INTEGER,
    tanggal: DataTypes.DATE,
    debit: DataTypes.DECIMAL,
    kredit: DataTypes.DECIMAL,
    saldo: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'BukuBesar',
  });
  return BukuBesar;
};
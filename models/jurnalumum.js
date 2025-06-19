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
      JurnalUmum.belongsTo(models.Akun, { as: 'akunDebit', foreignKey: 'akunDebitId' });
      JurnalUmum.belongsTo(models.Akun, { as: 'akunKredit', foreignKey: 'akunKreditId' });
    }
  }
  JurnalUmum.init({
    tanggal: DataTypes.DATE,
    keterangan: DataTypes.TEXT,
    akunDebitId: DataTypes.INTEGER,
    akunKreditId: DataTypes.INTEGER,
    jumlah: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'JurnalUmum',
  });
  return JurnalUmum;
};
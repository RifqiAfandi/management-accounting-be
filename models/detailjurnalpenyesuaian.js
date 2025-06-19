'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DetailJurnalPenyesuaian extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  DetailJurnalPenyesuaian.init({
    debet: DataTypes.DECIMAL,
    kredit: DataTypes.DECIMAL,
    JurnalPenyesuaianId: DataTypes.INTEGER,
    AkunNomorAkun: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'DetailJurnalPenyesuaian',
  });
  return DetailJurnalPenyesuaian;
};
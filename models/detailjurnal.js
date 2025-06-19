'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DetailJurnal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  DetailJurnal.init({
    debet: DataTypes.DECIMAL,
    kredit: DataTypes.DECIMAL,
    JurnalUmumId: DataTypes.INTEGER,
    AkunNomorAkun: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'DetailJurnal',
  });
  return DetailJurnal;
};
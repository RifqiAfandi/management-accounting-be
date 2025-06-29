'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetailJurnalPenyesuaians', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      debet: {
        type: Sequelize.DECIMAL
      },
      kredit: {
        type: Sequelize.DECIMAL
      },
      JurnalPenyesuaianId: {
        type: Sequelize.INTEGER
      },
      AkunNomorAkun: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DetailJurnalPenyesuaians');
  }
};
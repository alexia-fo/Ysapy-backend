const { DataTypes } = require('sequelize');
const db = require('../db/conections');

const Sucursal = db.define('Sucursal', {

    idSucursal: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    nombre: {
        type: DataTypes.STRING, allowNull: false   },
    estado: {
        type: DataTypes.BOOLEAN, defaultValue: true },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
},{
    createdAt: true,
    updatedAt: true,
    tableName: 'sucursales'
});


//la fk se configura en usuario para no provocar un ciclo de importacion

module.exports = Sucursal;
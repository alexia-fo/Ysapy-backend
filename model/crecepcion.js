///////////YO

//const { DataTypes } = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');
const Sucursal = require('./sucursal');
const CInventario = require('./cInventario');

const CRecepcion = db.define('Crecepcion', {

    idRecepcion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    fecha: {
        type: DataTypes.TIME, allowNull: false   },
    observacion: {
        type: DataTypes.TEXT  },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
    nroComprobante: {
        type: DataTypes.TEXT, allowNull: false  },
    estado: {
        type: DataTypes.BOOLEAN , defaultValue:1    },
    idsucursal: {
        type: DataTypes.INTEGER, allowNull: false  },
    idcabinventario: {
        type: DataTypes.INTEGER, allowNull: false  },
},{
    createdAt: true,
    updatedAt: true,
    tableName: 'crecepcion'
});

CRecepcion.belongsTo(Usuario, {
    foreignKey: 'idusuario'
});

CRecepcion.belongsTo(Sucursal, {
    foreignKey: 'idsucursal'
});

CRecepcion.belongsTo(CInventario, {
    foreignKey: 'idcabinventario'
});

module.exports = CRecepcion;


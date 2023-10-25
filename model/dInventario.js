///////////YO

//const { DataTypes } = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');
const CInventario = require('./cInventario');
const Producto = require('./producto');



const DInventario = db.define('DInventario', {

    idInventario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    idcabecera: {
        type: DataTypes.INTEGER, allowNull: false  },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
    idproducto: {
        type: DataTypes.INTEGER, allowNull: false  },
    precio: {
        type: DataTypes.INTEGER, allowNull: false  },
    cantidadApertura: {
        type: DataTypes.INTEGER, allowNull: true  },
    cantidadCierre: {
        type: DataTypes.INTEGER, allowNull: true  },
    cantidadRecepcion: {
        type: DataTypes.INTEGER, allowNull: true  },
    cantidadSalida: {
        type: DataTypes.INTEGER, allowNull: true  },
    totalApertura: {
        type: DataTypes.INTEGER, allowNull: true   },
    totalCierre: {
        type: DataTypes.INTEGER, allowNull: true   },
},{
    createdAt: true,
    updatedAt: true,
    tableName: 'dinventario'
});

DInventario.belongsTo(CInventario, {
    foreignKey: 'idcabecera'
});

DInventario.belongsTo(Usuario, {
    foreignKey: 'idusuario'
});

DInventario.belongsTo(Producto, {
    foreignKey: 'idproducto'
});

///prueba
Producto.hasMany(DInventario, { foreignKey: 'idproducto' });

Usuario.hasMany(DInventario, { foreignKey: 'idusuario' });

CInventario.hasMany(DInventario, { foreignKey: 'idcabecera' });

module.exports = DInventario;


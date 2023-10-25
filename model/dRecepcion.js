///////////YO

//const { DataTypes } = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const CRecepcion = require('./crecepcion');
const Producto = require('./producto');



const DRecepcion = db.define('Drecepcion', {

    idcrecepcion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    idproducto: {
        type: DataTypes.INTEGER,
        //primaryKey: true,
        //unique: true
    },
    cantidad: {
        type: DataTypes.INTEGER, allowNull: true   },
    total: {
        type: DataTypes.INTEGER, allowNull: true   },

},{
    createdAt: false,
    updatedAt: false,
    tableName: 'drecepcion'
});

DRecepcion.belongsTo(CRecepcion, {
    foreignKey: 'idcrecepcion'
});

DRecepcion.belongsTo(Producto, {
    foreignKey: 'idproducto'
});

module.exports = DRecepcion;

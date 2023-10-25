///////////YO

//const { DataTypes } = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Producto = require('./producto');
const CSalida = require('./csalida');
const Salida = require('./salida');



const DSalida = db.define('Dsalida', {

    idcsalida: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        //unique: true
    },
    idproducto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        //unique: true
    },
    idsalida: {
        type: DataTypes.INTEGER, allowNull: true   },
    cantidad: {
        type: DataTypes.INTEGER, allowNull: true   },
    total: {
        type: DataTypes.INTEGER, allowNull: true   },

},{
    createdAt: false,
    updatedAt: false,
    tableName: 'dsalida'
});

DSalida.belongsTo(CSalida, {
    foreignKey: 'idcsalida'
});

DSalida.belongsTo(Producto, {
    foreignKey: 'idproducto'
});

DSalida.belongsTo(Salida, {
    foreignKey: 'idsalida'
});

module.exports = DSalida;


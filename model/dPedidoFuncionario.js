
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Producto = require('./producto');
const CSalida = require('./csalida');
const Salida = require('./salida');
const CPedidoFuncionario = require('./cPedidoFuncionario');

const DPedidoFuncionario = db.define('dPedidoFuncionario', {

    idcpedido: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        //unique: true
    },
    idproducto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        //unique: true
    },
    cantidad: {
        type: DataTypes.INTEGER, allowNull: true   },

},{
    createdAt: false,
    updatedAt: false,
    tableName: 'dpedidofuncionario'
});

DPedidoFuncionario.belongsTo(CPedidoFuncionario, {
    foreignKey: 'idcpedido'
});

DPedidoFuncionario.belongsTo(Producto, {
    foreignKey: 'idproducto'
});

//add

CPedidoFuncionario.hasMany(DPedidoFuncionario, {
    foreignKey: 'idcpedido',
});

module.exports = DPedidoFuncionario;


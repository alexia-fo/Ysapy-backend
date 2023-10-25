///////////YO

//const { DataTypes } = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');
const Sucursal = require('./sucursal');
const CInventario = require('./cInventario');



const CSalida = db.define('Csalida', {

    idCabecera: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    idcabinventario: {
        type: DataTypes.INTEGER,
    },
    fecha: {
        type: DataTypes.TIME  },
    observacion: {
        type: DataTypes.TEXT  },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
    idsucursal: {
        type: DataTypes.INTEGER, allowNull: false  },
},{
    createdAt: true,
    updatedAt: true,
    tableName: 'csalida'
});

CSalida.belongsTo(Usuario, {
    foreignKey: 'idusuario'
});

CSalida.belongsTo(Sucursal, {
    foreignKey: 'idsucursal'
});

CSalida.belongsTo(CInventario, {
    foreignKey: 'idcabinventario'
});

module.exports = CSalida;

/*


*/
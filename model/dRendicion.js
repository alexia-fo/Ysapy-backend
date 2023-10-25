///////////YO

//const { DataTypes } = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');
const CInventario = require('./cInventario');
const Dinero = require('./dinero');



const DRendicion = db.define('Drendicion', {

    idRendicion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    idcabecera: {
        type: DataTypes.INTEGER, allowNull: false  },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
    iddinero: {
        type: DataTypes.INTEGER, allowNull: false  },
    cantidadApertura: {
        type: DataTypes.INTEGER, allowNull: true  },
    cantidadCierre: {
        type: DataTypes.INTEGER, allowNull: true  },
    totalApertura: {
        type: DataTypes.INTEGER, allowNull: true   },
    totalCierre: {
        type: DataTypes.INTEGER, allowNull: true   },
},{
    createdAt: true,
    updatedAt: true,
    tableName: 'drendicion'
});
/*
Clasificacion.hasMany(Producto, {
    foreignKey: 'idclasificacion'
  });
  */
    DRendicion.belongsTo(CInventario, {
        foreignKey: 'idcabecera'
    });
    DRendicion.belongsTo(Usuario, {
        foreignKey: 'idusuario'
    });

    DRendicion.belongsTo(Dinero, {
        foreignKey: 'iddinero'
    });


module.exports = DRendicion;


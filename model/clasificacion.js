//const { DataTypes } = require('sequelize');
const { DataTypes } = require('sequelize');
const db = require('../db/conections');


const Clasificacion = db.define('Clasificacion', {

    idClasificacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    nombre: {
        type: DataTypes.STRING, allowNull: false   
    },

},{
    createdAt: false,
    updatedAt: false,
    tableName: 'clasificacion'
});

module.exports = Clasificacion;


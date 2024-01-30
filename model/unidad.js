const { DataTypes } = require('sequelize');
const db = require('../db/conections');

const Unidad = db.define('Unidad', {
    codUnidad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },  
    NombreUnidad: {type: DataTypes.STRING, allowNull: false   },

},{
    createdAt: false,
    updatedAt: false,
    tableName: 'unidad'    
});

module.exports = Unidad;


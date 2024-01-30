const { DataTypes } = require('sequelize');
const db = require('../db/conections');

const Marca = db.define('Marca', {
    codMarca: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },  
    nombreMarca: {type: DataTypes.STRING, allowNull: false   },

},{
    createdAt: false,
    updatedAt: false,
    tableName: 'marca'    
});

module.exports = Marca;


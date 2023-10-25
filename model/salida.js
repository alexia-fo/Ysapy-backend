const { DataTypes } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');

                        //aparece cuando se ven los datos de la fk
const Salida = db.define('Salida', {
    idSalida: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },  
    descripcion: {type: DataTypes.STRING, allowNull: false   },

},{
    createdAt: false,
    updatedAt: false,
    tableName: 'salidas'    
});

module.exports = Salida;

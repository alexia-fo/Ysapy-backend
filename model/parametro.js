const { DataTypes } = require('sequelize');
const db = require('../db/conections');

const Parametro = db.define('Parametro', {
    idParametro: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },  
    nombre: {type: DataTypes.STRING, allowNull: false   },
    valor: {type: DataTypes.STRING, allowNull: false   },
    descripcion: {type: DataTypes.STRING, allowNull: false   },

},{
    createdAt: false,
    updatedAt: false,
    tableName: 'parametros'    
});

module.exports = Parametro;


const { DataTypes } = require('sequelize');
const db = require('../db/conections');

const Rol = db.define('Rol', {
    idRol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },  
    rol: {type: DataTypes.STRING, allowNull: false   },
    tipo: {type: DataTypes.STRING, allowNull: false   },
    activo: {
        type: DataTypes.BOOLEAN, defaultValue: true     },
},{
    createdAt: false,
    updatedAt: false,
    tableName: 'roles'    
});

module.exports = Rol;


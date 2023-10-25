
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Sucursal = require('./sucursal');
const Rol = require('./rol');

const Usuario = db.define('Usuario', {

    idUsuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    nombre: {
        type: DataTypes.STRING, allowNull: false   },
    nusuario: {
        type: DataTypes.STRING, allowNull: false  },
    correo: {
        type: DataTypes.STRING, allowNull: true    },
    contra: {
            type: DataTypes.STRING    }, 
    /*tipo: {
        type: DataTypes.CHAR(1), defaultValue: 'C', comment: ' E empleado o C cliente'    },
    nivel: {
        type: DataTypes.CHAR(1),  comment: ' R root, A admin o F funcionario'  },
    */
    activo: {
        type: DataTypes.BOOLEAN, defaultValue: true     },
    img: {
        type: DataTypes.STRING(200)     },
    google: {
        type: DataTypes.BOOLEAN, defaultValue: false  },
    /*rol: {
        type: DataTypes.STRING     },
    */
    idsucursal: {
        type: DataTypes.INTEGER, allowNull: false  },
    idrol: {
        type: DataTypes.INTEGER, allowNull: false  },
    turno: {
        type: DataTypes.CHAR(1), allowNull: false  },        
},{
    tableName: 'usuarios'
  });


module.exports = Usuario;


//para obtener nombre
Usuario.belongsTo(Sucursal, {
    foreignKey: 'idsucursal'
});


/*
problema debido a la dependencia circular entre los modelos "Usuario" y "Sucursal". Se soluciona el conflicto utilizando una técnica llamada "asociaciones tardías" en Sequelize.

La idea es retrasar la definición de la asociación hasta que ambos modelos hayan sido definidos completamente. Para lograr esto, puedes eliminar la asociación directa de "belongsTo" en el modelo "Sucursal" y agregarla más tarde después de haber definido ambos modelos por completo.
*/


Sucursal.belongsTo(Usuario, {
foreignKey: 'idusuario'
});

Usuario.belongsTo(Rol, {
foreignKey: 'idrol'
});



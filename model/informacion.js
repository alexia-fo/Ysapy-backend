const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');
const Clasificacion = require('./clasificacion');

const Informacion = db.define('Informacion', {

    idInformacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    titulo: {
        type: DataTypes.STRING(200), allowNull: false   },
    descripcion: {
        type: DataTypes.TEXT, allowNull: false },
    fecha: {
        type: DataTypes.DATE, allowNull: true },
    img: {
        type: DataTypes.STRING(200), allowNull: true },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
    activo: {
        type: DataTypes.BOOLEAN, defaultValue: true},
},{
    createdAt: false,
    updatedAt: false,
    tableName: 'informaciones'
});

Usuario.hasMany(Informacion, { 
    foreignKey: 'idusuario' 
});

Informacion.belongsTo(Usuario, {
    foreignKey: 'idusuario' 
});

module.exports = Informacion;


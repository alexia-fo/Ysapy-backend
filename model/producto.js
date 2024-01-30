const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');
const Clasificacion = require('./clasificacion');
const Marca = require('./marca');
const Unidad = require('./unidad');

const Producto = db.define('Producto', {

    idProducto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    idclasificacion: {
        type: DataTypes.INTEGER, allowNull: false  },
    nombre: {
        type: DataTypes.STRING, allowNull: false   },
    descripcion: {
        type: DataTypes.TEXT, allowNull: true },
    img: {
        type: DataTypes.STRING(200), allowNull: true },
    precio: {
        type: DataTypes.INTEGER, allowNull: false },
    facturable: {
        type: DataTypes.BOOLEAN, defaultValue: true },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
    activo: {
        type: DataTypes.BOOLEAN, defaultValue: true},
    idmarca: {
        type: DataTypes.INTEGER, allowNull:false},
    idunidad: {
        type: DataTypes.INTEGER, allowNull:false},
},{
    createdAt: true,
    updatedAt: true,
    tableName: 'producto'
});

/*
En resumen, la diferencia entre estas dos funciones es la dirección de la relación: 
"hasMany" establece una relación de uno a muchos desde "Clasificacion" hacia "Producto", 
mientras que "belongsTo" establece una relación de pertenencia desde "Producto" hacia 
"Clasificacion". Ambas funciones utilizan la misma clave externa 'idclasificacion' para 
establecer la relación.
*/


Clasificacion.hasMany(Producto, {
    foreignKey: 'idclasificacion'
});
Producto.belongsTo(Clasificacion, {
    foreignKey: 'idclasificacion'
});

Usuario.hasMany(Producto, { 
    foreignKey: 'idusuario' 
});
Producto.belongsTo(Usuario, {
    foreignKey: 'idusuario' 
});


//agregado
Marca.hasMany(Producto, {
    foreignKey: 'idmarca'
});
Producto.belongsTo(Marca, {
    foreignKey: 'idmarca'
});

Unidad.hasMany(Producto, {
    foreignKey: 'idunidad'
});
Producto.belongsTo(Unidad, {
    foreignKey: 'idunidad'
});


module.exports = Producto;


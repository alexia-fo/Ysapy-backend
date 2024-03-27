const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');
const Sucursal = require('./sucursal');
const CInventario = require('./cInventario');
const Marca = require('./marca');
const Parametro = require('./parametro');

const CPedidoFuncionario = db.define('CpedidoFuncionario', {

    idCabecera: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    fechaAlta: {
        type: DataTypes.TIME  },
    observacion: {
        type: DataTypes.TEXT  },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
    estado: {
        type: DataTypes.BOOLEAN , defaultValue: 1    },
    idsucursal: {
        type: DataTypes.INTEGER, allowNull: false  },
    fechaEntrega: {
        type: DataTypes.DATE  },
    idmarca: {
        type: DataTypes.INTEGER, allowNull: false  },
    // turno: {//era una llave foranea de la tabla parametro
    //     type: DataTypes.INTEGER, allowNull: true  },//allowNull: true era false //TODO: COMENTADO PARA IMPLEMENTAR 27-03-2024
}
,{
    createdAt: true,
    updatedAt: true,
    tableName: 'cpedidofuncionario'
});

CPedidoFuncionario.belongsTo(Usuario, {
    foreignKey: 'idusuario'
});

CPedidoFuncionario.belongsTo(Sucursal, {
    foreignKey: 'idsucursal'
});

CPedidoFuncionario.belongsTo(Marca, {
    foreignKey: 'idmarca'
});

//add

            //TODO: POR AHORA EL TURNO YA NO SERA ESTABLECIDO EN LA CABECERA COMO UN ID, POR ESO YA NO SERA NECESARIO FILTRAR LOS INFORMES POR TURNO

// CPedidoFuncionario.belongsTo(Parametro, {
//     foreignKey: 'turno'
// });


CPedidoFuncionario.belongsTo(Sucursal, { foreignKey: 'idsucursal' });



module.exports = CPedidoFuncionario;

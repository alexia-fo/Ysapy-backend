const { DataTypes } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');
const Sucursal = require('./sucursal');

const CInventario = db.define('CInventario', {

    idCabecera: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    fechaApertura: {
      type: DataTypes.TIME  },
    fechaCierre: {
      type: DataTypes.TIME  },
    montoApertura: {
      type: DataTypes.INTEGER  },
    montoCierre: {
      type: DataTypes.INTEGER  },
    //prueba
    montoPendiente:{
      type: DataTypes.INTEGER  },
    montoDiferencia: {
      type: DataTypes.INTEGER  },
    idsucursal: {
        type: DataTypes.INTEGER, allowNull: false  },
    idusuario: {
        type: DataTypes.INTEGER, allowNull: false  },
    turno: {
      type: DataTypes.STRING    },
    observacion: {
        type: DataTypes.TEXT  },
    estado: {
      // type: DataTypes.BOOLEAN    },
        type: DataTypes.STRING    },
    //TODO:PROBANDO COBROS POR CREDITOS
    montoOtrosCobros: {
      type: DataTypes.INTEGER    },
      //////////////////TODO:PROBANDO MEGAS INICIALES Y FINALES
  //   megasIniciales: {
  //     type: DataTypes.STRING   
  //   },
  //   megasFinales: {
  //     type: DataTypes.STRING   
  // },
},{
    createdAt: true,
    updatedAt: true,
    tableName: 'cinventario'
});

  CInventario.belongsTo(Sucursal, {
    foreignKey: 'idsucursal'
  });

  Sucursal.hasMany(CInventario, {
    foreignKey: 'idsucursal'
  });
  
  CInventario.belongsTo(Usuario, {
    foreignKey: 'idusuario'
  });

  Usuario.hasMany(CInventario, {
    foreignKey: 'idusuario'
  });


module.exports = CInventario;


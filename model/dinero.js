//const { DataTypes } = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const db = require('../db/conections');
const Usuario = require('./usuario');

// function formatDecimal(value, decimalDigits) {
//     const parts = value.toFixed(decimalDigits).split('.');
//     parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
//     return parts.join('.');
//   }

// function formatDecimal(value, decimalDigits) {
//     const stringValue = String(value);
//     const [integerPart, decimalPart] = stringValue.split('.');
//     const formattedValue = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (decimalPart ? `.${decimalPart}` : '');
//     return Number.parseFloat(formattedValue);
//   }
  

const Dinero = db.define('Dinero', {


    idBillete: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true
    },
    nombreBillete: {
        type: DataTypes.STRING, allowNull: false   },
    monto: {
        type: DataTypes.DECIMAL(18, 5),
        allowNull: false,
        /*
        get() {
            const value = this.getDataValue('monto');
            // return parseFloat(value); // Convierte el valor a un número decimal al obtenerlo
            // return Number(value); // Convierte el valor a un número decimal sin redondear
              return Number(value).toFixed(5); // Convierte el valor a un número decimal y formatea con 5 dígitos decimales ==> string
            // return Number(value).toLocaleString(undefined, { minimumFractionDigits: 5 }); // Convierte el valor a un número decimal y formatea con 5 dígitos decimales
            //   return formatDecimal(Number(value), 5); // Formatea el valor con 5 dígitos decimales y separador de punto

            // return formatDecimal(value, 5); // Formatea el valor con 5 dígitos decimales y separador de punto
        }*/
    },
    estado: {
        type: DataTypes.BOOLEAN, defaultValue: true     },
    entrada: {
    //TODO:PROBANDO COBROS POR CREDITOS
        // type: DataTypes.BOOLEAN, defaultValue: true     },
        type: DataTypes.INTEGER, defaultValue: true     },

},{
    createdAt:false,
    updatedAt:false,
    tableName: 'dinero',
});

module.exports = Dinero;
const fs = require('fs');
const moment = require('moment-timezone');
const Sequelize = require('sequelize');
const pdfMake = require('pdfmake');
const { DInventario, CInventario, Producto, Sucursal } = require('../model');

const generateCSV = (detalleInventario) => {
    let csvContent = "Id Prod.,Nombre,Cantidad,Precio,Total Prod.\n";

    detalleInventario.forEach((producto) => {
        const rowData = [
            producto.idproducto,
            producto.Producto.nombre,
            producto.cantidadTotal ?? 'N/A',
            Math.round(producto.precio).toLocaleString('es-PY') ?? 'N/A',
            Math.round(producto.totalMultiplicado).toLocaleString('es-PY') ?? 'N/A'
        ];

        csvContent += rowData.join(',') + "\n";
    });

    return csvContent;
};

const obtenerVentasCSV = async (req, res) => {
    try {
        //VARIABLES
    
        //id cinventario en bd
        const idCabecera = req.params.id;

        //CONSULTAS
        let [cabecera, detalleInventario] = await Promise.all([
            CInventario.findOne({
            where: { idCabecera },
            include: [
                {
                model: Sucursal,
                attributes: ['nombre'],
                },
            ],
            }),
            DInventario.findAll({
            where: { idcabecera: idCabecera },
            attributes: [
                'idproducto',
                'precio',
                [Sequelize.literal('(cantidadApertura - cantidadCierre + cantidadRecepcion - cantidadSalida)'), 'cantidadTotal'],
                [Sequelize.literal('DInventario.precio * (cantidadApertura - cantidadCierre + cantidadRecepcion - cantidadSalida)'), 'totalMultiplicado'],
            ],
            include: [
                {
                model: Producto,
                attributes: ['nombre'],
                },
            ],
            order: [
                [{ model: Producto }, 'nombre', 'ASC'],
            ],
            }),
        ]);

        //FILTRAR SOLO LOS PRODUCTOS VENDIDOS
        // Filtrar solo los productos con cantidadTotal > 0
        detalleInventario = detalleInventario.filter(producto => producto.dataValues.cantidadTotal > 0);


        // ... (tu código actual)

        // Guardar datos en CSV
        const csvContent = generateCSV(detalleInventario);

        // // Especificar la ruta y el nombre del archivo CSV
        // const csvFilePath = 'ruta/del/archivo.csv';

        // // Escribir el archivo CSV
        // fs.writeFileSync(csvFilePath, csvContent);

        // Enviar el archivo CSV como respuesta al cliente
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="productos.csv"');
        res.send(csvContent);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'Error al generar el archivo CSV de ventas' });
    }
};

// ...

module.exports={
    obtenerVentasCSV
}
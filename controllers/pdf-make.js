const pdfMake = require('pdfmake');
const fs = require('fs');
const {Clasificacion, Producto ,Usuario, CInventario, Sucursal, DInventario} = require('../model');
//Para transacciones
const sequelize = require('../db/conections');
//Para operador AND, OR, etc..
const { Op } = require('sequelize');
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';

const obtenerPdfDetalleInventario = async (req, res) => {

  const {idCabecera}=req.query;

  // Consulta para obtener los campos y calcular el total 
  const detalleInventario = await DInventario.findAll({
      where: { idcabecera: idCabecera }, // Agregamos la condición para filtrar por idCabecera
      attributes: [
      'idproducto',
      'cantidadApertura',
      'cantidadCierre',
      'cantidadRecepcion',
      'cantidadSalida',
      'precio',
      ],
      include: [
      {
          model: Producto,
          attributes: ['nombre'],
      },
      ],
  });

  ////////////////////////

  const fonts = {
    Roboto: {
      normal: 'fonts/roboto/Roboto-Regular.ttf',
      bold: 'fonts/roboto/Roboto-Bold.ttf',
      italics: 'fonts/roboto/Roboto-Italic.ttf',
      bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
    }
  };

  const printer = new pdfMake(fonts);

    const [total, cabeceras] = await Promise.all([
        CInventario.count({ where: {fechaApertura: { [Op.between]: [desde, limite] } } }),
        CInventario.findAll({
            where: {fechaApertura: { [Op.between]: [desde, limite] } },
            include: [{ model: Usuario, attributes: ['nombre'] },
            { model: Sucursal, attributes: ['nombre'] }
        ]  
        })
    ]);

  const content = [];

  // Encabezado del PDF
  content.push({ text: 'Detalle de inventario', style: 'header' });
  content.push('\n');

  // Tabla de productos
  const tableBody = [];
  tableBody.push(['Producto', 'Apertura', 'Cierre', 'Recepcion', 'Salida', 'Precio']);

  
  cabeceras.forEach((cabecera, index) => {
    /////////////
    const fechaAperturaFormatted = moment(cabecera.fechaApertura).format('YYYY-MM-DD HH:mm:ss');
    const fechaCierreFormatted = moment(cabecera.fechaCierre).format('YYYY-MM-DD HH:mm:ss');
    // const fechaApertura = new Date(cabecera.fechaApertura); // Convertir cadena a Date
    // const fechaCierre = new Date(cabecera.fechaCierre); // Convertir cadena a Date
  
  
    ////////////
    const rowData = [
      /////////
      fechaAperturaFormatted,
      fechaCierreFormatted,

      // fechaApertura.toISOString(), // Convertir Date a ISO string para mostrarlo correctamente
      // fechaCierre.toISOString(), // Convertir Date a ISO string para mostrarlo correctamente
      
      /////////////
      cabecera.Sucursal?.nombre || '', // Use optional chaining to handle potential undefined values
      cabecera.turno || '',
      cabecera.Usuario?.nombre || '', // Use optional chaining to handle potential undefined values
      cabecera.montoApertura || 0, // Provide default values if the properties are undefined
      cabecera.montoCierre || 0,
      cabecera.montoDieferecia || 0,
    ];
    console.log(rowData); 
    tableBody.push(rowData);
  });

  const table = {
    table: {
      headerRows: 1,
      widths: ['*', '*', '*', '*','*', '*', '*', '*'],
      body: tableBody,
      //add
      // layout: {
      //   fillColor: function (i, node) {
      //     return i % 2 === 0 ? '#f0f0f0' : null; // Agrega colores alternados para las filas
      //   },
      // }
    }
  };

  content.push(table);

  // Definición de estilos
  const styles = {
    header: {
      fontSize: 18,
      bold: true,
      margin: [0, 0, 0, 0, 0, 0, 0, 10]
    }
  };

  const docDefinition = {
    content,
    styles,
    //add
    pageOrientation: 'landscape', // Establece la orientación horizontal
    pageSize: 'A4', // O cualquier otro tamaño de página que prefieras
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  // Convertir el PDF a una respuesta streamable
  const chunks = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  pdfDoc.on('end', () => {
    const pdfData = Buffer.concat(chunks);

    // Enviar el PDF como respuesta al cliente
    res.setHeader('Content-Type', 'application/pdf');
    // PARA DESCARGAR DIRECTAMENTE EL PDF
    res.setHeader('Content-Disposition', 'attachment; filename="productos.pdf"');

    res.send(pdfData);
  });

  pdfDoc.end();
};


const pdfCabecerasInventario = async (req, res) => {
  // Obtener la fecha actual según la zona horaria de Paraguay
  const fechaActual = moment().tz(zonaHorariaParaguay);
  // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
  const fechaHoy = fechaActual.format('YYYY-MM-DD');

  // Restar 7 días a la fecha actual
  const fechaHace7Dias = fechaActual.subtract(7, 'days');
  // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
  const fechaHace7DiasFormateada = fechaHace7Dias.format('YYYY-MM-DD');

  const  {limite = fechaHoy} = req.query;
  const  {desde =fechaHace7DiasFormateada } = req.query;

  const fonts = {
    Roboto: {
      normal: 'fonts/roboto/Roboto-Regular.ttf',
      bold: 'fonts/roboto/Roboto-Bold.ttf',
      italics: 'fonts/roboto/Roboto-Italic.ttf',
      bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
    }
  };

  const printer = new pdfMake(fonts);

    const [total, cabeceras] = await Promise.all([
        CInventario.count({ where: {fechaApertura: { [Op.between]: [desde, limite] } } }),
        CInventario.findAll({
            where: {fechaApertura: { [Op.between]: [desde, limite] } },
            include: [{ model: Usuario, attributes: ['nombre'] },
            { model: Sucursal, attributes: ['nombre'] }
        ]  
        })
    ]);

  const content = [];

  // Encabezado del PDF
  content.push({ text: 'Datos de Inventario', style: 'header' });
  content.push('\n');

  // Tabla de productos
  const tableBody = [];
  tableBody.push(['Apertura', 'Cierre', 'Sucursal', 'Turno', 'Usuario', 'MontoA', 'montoC', 'montoD']);

  
  cabeceras.forEach((cabecera, index) => {
    /////////////
    const fechaAperturaFormatted = moment(cabecera.fechaApertura).format('YYYY-MM-DD HH:mm:ss');
    const fechaCierreFormatted = moment(cabecera.fechaCierre).format('YYYY-MM-DD HH:mm:ss');
    // const fechaApertura = new Date(cabecera.fechaApertura); // Convertir cadena a Date
    // const fechaCierre = new Date(cabecera.fechaCierre); // Convertir cadena a Date
  
  
    ////////////
    const rowData = [
      /////////
      fechaAperturaFormatted,
      fechaCierreFormatted,

      // fechaApertura.toISOString(), // Convertir Date a ISO string para mostrarlo correctamente
      // fechaCierre.toISOString(), // Convertir Date a ISO string para mostrarlo correctamente
      
      /////////////
      cabecera.Sucursal?.nombre || '', // Use optional chaining to handle potential undefined values
      cabecera.turno || '',
      cabecera.Usuario?.nombre || '', // Use optional chaining to handle potential undefined values
      cabecera.montoApertura || 0, // Provide default values if the properties are undefined
      cabecera.montoCierre || 0,
      cabecera.montoDieferecia || 0,
    ];
    console.log(rowData); 
    tableBody.push(rowData);
  });

  const table = {
    table: {
      headerRows: 1,
      widths: ['*', '*', '*', '*','*', '*', '*', '*'],
      body: tableBody,
      //add
      // layout: {
      //   fillColor: function (i, node) {
      //     return i % 2 === 0 ? '#f0f0f0' : null; // Agrega colores alternados para las filas
      //   },
      // }
    }
  };

  content.push(table);

  // Definición de estilos
  const styles = {
    header: {
      fontSize: 18,
      bold: true,
      margin: [0, 0, 0, 0, 0, 0, 0, 10]
    }
  };

  const docDefinition = {
    content,
    styles,
    //add
    pageOrientation: 'landscape', // Establece la orientación horizontal
    pageSize: 'A4', // O cualquier otro tamaño de página que prefieras
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  // Convertir el PDF a una respuesta streamable
  const chunks = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  pdfDoc.on('end', () => {
    const pdfData = Buffer.concat(chunks);

    // Enviar el PDF como respuesta al cliente
    res.setHeader('Content-Type', 'application/pdf');
    // PARA DESCARGAR DIRECTAMENTE EL PDF
    res.setHeader('Content-Disposition', 'attachment; filename="productos.pdf"');

    res.send(pdfData);
  });

  pdfDoc.end();
};

  const generarPDF2 = async (req, res) => {
    
    console.log('-------Generando pdf-----');
    //res.json({respuesta:'se ha recibido la respuesta'})
    const headers = req.headers;
    console.log('Encabezados de la petición: ', headers);

    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };
  
    const printer = new pdfMake(fonts);
  
    const productos = await Producto.findAll({
      include: [
        { model: Usuario, attributes: ['nombre'] },
        { model: Clasificacion, attributes: ['nombre'] }
      ]
    });
  
    const content = [];
  
    // Encabezado del PDF
    content.push({ text: 'Productos Vendidos por Sucursal y Usuario', style: 'header' });
    content.push('\n');
  
    // Datos de los productos
    productos.forEach((producto, index) => {
      content.push({ text: `Producto ${index + 1}`, style: 'subheader' });
      content.push({ text: `Nombre: ${producto.nombre}` });
      content.push({ text: `Precio: ${producto.precio}` });
      content.push({ text: `Vendido por: ${producto.Usuario.nombre}` });
      content.push({ text: `Clasificación: ${producto.Clasificacion.nombre}` });
      content.push('\n');
    });
  
    // Definición de estilos
    const styles = {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5]
      }
    };
  
    const docDefinition = {
      content,
      styles
    };
  
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
  
    // Convertir el PDF a una respuesta streamable
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const pdfData = Buffer.concat(chunks);
  
      // Enviar el PDF como respuesta al cliente
      res.setHeader('Content-Type', 'application/pdf');
      //PARA DESCARGAR DIRECTAMENTE EL PDF
     // res.setHeader('Content-Disposition', 'attachment; filename="productos.pdf"');
     res.setHeader('Content-Disposition', 'inline; filename="productos.pdf"');// Cambio de 'attachment' a 'inline' 
      
     res.send(pdfData);
    });
  
    pdfDoc.end();
  };
  
  const generarPDF = async (req, res) => {
    console.log('-------Generando pdf-----');
    //res.json({respuesta:'se ha recibido la respuesta'})
    const headers = req.headers;
    console.log('Encabezados de la petición:', headers);
  
    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };
  
    const printer = new pdfMake(fonts);
  
    const productos = await Producto.findAll({
      include: [
        { model: Usuario, attributes: ['nombre'] },
        { model: Clasificacion, attributes: ['nombre'] }
      ]
    });
  
    const content = [];
  
    // Encabezado del PDF
    content.push({ text: 'Productos Vendidos por Sucursal y Usuario', style: 'header' });
    content.push('\n');
  
    // Tabla de productos
    const tableBody = [];
    tableBody.push(['Nombre', 'Precio', 'Vendido por', 'Clasificación']);
  
    productos.forEach((producto, index) => {
      tableBody.push([
        producto.nombre,
        producto.precio.toString(),
        producto.Usuario.nombre,
        producto.Clasificacion.nombre
      ]);
    });
  
    const table = {
      table: {
        headerRows: 1,
        widths: ['*', '*', '*', '*'],
        body: tableBody
      }
    };
  
    content.push(table);
  
    // Definición de estilos
    const styles = {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      }
    };
  
    const docDefinition = {
      content,
      styles
    };
  
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
  
    // Convertir el PDF a una respuesta streamable
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const pdfData = Buffer.concat(chunks);
  
      // Enviar el PDF como respuesta al cliente
      res.setHeader('Content-Type', 'application/pdf');
      // PARA DESCARGAR DIRECTAMENTE EL PDF
      res.setHeader('Content-Disposition', 'attachment; filename="productos.pdf"');

      res.send(pdfData);
    });
  
    pdfDoc.end();
  };

module.exports = {
  pdfCabecerasInventario,
  generarPDF,
  generarPDF2,
}

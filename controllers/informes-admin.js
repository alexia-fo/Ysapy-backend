const pdfMake = require('pdfmake');
const fs = require('fs');
const {Clasificacion, Producto ,Usuario, CInventario, Sucursal, DInventario, Dinero} = require('../model');
//Para transacciones
const sequelize = require('../db/conections');

//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';

const { Sequelize, Op } = require("sequelize");
const DRendicion = require('../model/dRendicion');


const obtenerRendicion = async (req, res) => {
  const idCabecera=req.params.id;
  // Obtener la fecha actual según la zona horaria de Paraguay
  const fechaActual = moment().tz(zonaHorariaParaguay);
  // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
  const fechaHoy = fechaActual.format('DD-MM-YYYY HH:MM:SS');
  //sumar todos los totales de los productos
  let totalCaja=0;
  let totalAperturaCaja=0;
  let totalCierreCaja=0;

  const fonts = {
    Roboto: {
      normal: 'fonts/roboto/Roboto-Regular.ttf',
      bold: 'fonts/roboto/Roboto-Bold.ttf',
      italics: 'fonts/roboto/Roboto-Italic.ttf',
      bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
    }
  };

  const printer = new pdfMake(fonts);

  const [cabecera, detalleRendicion] = await Promise.all([
    CInventario.findOne({
      where: { idCabecera },
      include: [
        {
          model: Sucursal,
          attributes: ['nombre'],
        },
      ],
    }),
    DRendicion.findAll({
      where: { idcabecera: idCabecera },
      attributes: [
          'cantidadApertura',
          'cantidadCierre',
          'totalApertura',
          'totalCierre',
      ],
      include: [
          {
              model: Dinero,
              attributes: ['nombreBillete', 'monto'], 
          },
      ],
      order: [
          [{ model: Dinero }, 'monto', 'DESC'] 
      ]
  })
  ]);
  

  // console.log(detalleInventario)

  // Encabezado del PDF
  const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
  const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
  const sucursal = cabecera.Sucursal.nombre;
  const turno = cabecera.turno;

  const montoApertura=cabecera.montoApertura;
  const montoCierre=cabecera.montoCierre;
  const montoDiferencia=cabecera.montoDiferencia;
  const montoPendiente=cabecera.montoPendiente;
  const montoOtrosCobros= cabecera.montoOtrosCobros;
  
  const content = [];
  content.push({ text: 'Rendición de Caja', alignment: 'center', margin:5, bold:true, fontSize:16 });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Fecha Apertura: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: fechaApertura,
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: { text: 'Fecha Cierre: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: fechaCierre,
      },
    ],
    margin: 3,
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Sucursal: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: sucursal,
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: { text: 'Turno: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: turno,
      },
    ],
    margin: 3,
  });

  content.push('\n');

  // Tabla de productos
  let tableBody = [];
  tableBody.push([{text:'Descripción', bold:true, alignment:'left'}, {text:'Monto', bold:true, alignment:'right'}, {text:'Cant. Apt.', bold:true, alignment:'center'}, {text:'Cant. Cier.', bold:true, alignment:'center'},
  {text:'Tot. Apt.', bold:true, alignment:'right'}, {text:'Tot. Cier.', bold:true, alignment:'right'}]);

  detalleRendicion.forEach((billete, index) => {
    billete=billete.dataValues;
    totalAperturaCaja+=Math.round(billete.totalApertura);
    totalCierreCaja+=Math.round(billete.totalCierre);
    tableBody.push([
      // billete.iddinero,
      billete.Dinero.nombreBillete,
      Math.round(billete.Dinero.monto).toLocaleString('es-PY') ,
      billete.cantidadApertura ?? 'N/A',
      billete.cantidadCierre ?? 'N/A',
      Math.round(billete.totalApertura).toLocaleString('es-PY') ?? 'N/A',
      Math.round(billete.totalCierre).toLocaleString('es-PY') ?? 'N/A',
    ]);
    
  });
  
  //calcular el total de nuevo monto entrado a caja
  totalCaja+=Math.round(totalCierreCaja-totalAperturaCaja);
  // console.log(tableBody)

  defaultAlignments =['left', 'right','center','center','right','right']

  tableBody=tableBody.map((row, rowIndex) => {
    if (rowIndex === 0) {
      // Aplicar alineación predeterminada solo a la cabecera
      return row;
    } else {
      // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
      return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
    }
  })

  //luego de alinear todas las filas añadimos el total
  // Agregar la fila con el total de productos al final
  // tableBody.push([
  //   { text: 'Total', bold:true},
  //   {},
  //   {},
  //   {},
  //   {text:Math.round(totalAperturaCaja).toLocaleString('es-PY'),alignment:'right', bold:true},
  //   {text:Math.round(totalCierreCaja).toLocaleString('es-PY'),alignment:'right', bold:true},
    
  // ]);

  // tableBody.push([
  //   { text: 'Diferencia C-A', bold:true},
  //   {},
  //   {},
  //   {},
  //   {},
  //   {text:Math.round(totalCaja).toLocaleString('es-PY'),alignment:'right', bold:true},
    
  // ]);

  const table = {
    table: {
      headerRows: 1,
      widths: ['*', 60, 60, 60, 80, 80],
      body: tableBody,
      // Establece repeat en false para que la cabecera no se repita en cada página
      repeat: false,
    },
    // layout: 'headerLineOnly'
    layout: 'noBorders',
    // fontSize:12
  };
  
  content.push(table);

  content.push('\n')

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Monto Apertura: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoApertura).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Monto Cierre: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoCierre).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Monto Diferencia: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoDiferencia).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Cobro Tarjeta y Creditos del día: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoPendiente).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Cobro de créditos anteriores : ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoOtrosCobros).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });


  const docDefinition = {
    content,
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          {
            text: fechaHoy, // Agrega la fecha actual a la izquierda
            fontSize:10,
            alignment: 'left',
            margin: [20, 0], // Ajusta el margen izquierdo para alinear a la izquierda
          },
          {
            text: `Página ${currentPage.toString()} de ${pageCount}`,
            fontSize:10,
            alignment: 'right',
            margin: [0, 0, 20, 0], // Ajusta el margen derecho para alinear a la derecha
          },
        ],
        margin: [40, 0], // Ajusta el margen izquierdo y derecho del pie de página
      };
    },
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

const obtenerVentas = async (req, res) => {
  const idCabecera=req.params.id;
  // Obtener la fecha actual según la zona horaria de Paraguay
  const fechaActual = moment().tz(zonaHorariaParaguay);
  // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
  const fechaHoy = fechaActual.format('DD-MM-YYYY HH:MM:SS');
  //sumar todos los totales de los productos
  let totalProductos=0;


  const fonts = {
    Roboto: {
      normal: 'fonts/roboto/Roboto-Regular.ttf',
      bold: 'fonts/roboto/Roboto-Bold.ttf',
      italics: 'fonts/roboto/Roboto-Italic.ttf',
      bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
    }
  };

  const printer = new pdfMake(fonts);

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

  // Filtrar solo los productos con cantidadTotal > 0
  detalleInventario = detalleInventario.filter(producto => producto.dataValues.cantidadTotal > 0);
  

  // console.log(detalleInventario)

  // Encabezado del PDF
  const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
  const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
  const sucursal = cabecera.Sucursal.nombre;
  const turno = cabecera.turno;
  
  const content = [];
  content.push({ text: 'Detalle de Ventas', alignment: 'center', margin:5, bold:true, fontSize:16 });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Fecha Apertura: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: fechaApertura,
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: { text: 'Fecha Cierre: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: fechaCierre,
      },
    ],
    margin: 3,
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Sucursal: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: sucursal,
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: { text: 'Turno: ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: turno,
      },
    ],
    margin: 3,
  });

  content.push('\n');


  // Tabla de productos
  let tableBody = [];
  tableBody.push([{text:'Id Prod.', bold:true, alignment:'center'}, {text:'Nombre', bold:true, alignment:'center'}, {text:'Cantidad', bold:true, alignment:'center'}, {text:'Precio', bold:true, alignment:'right'}, {text:'Total', bold:true, alignment:'right'}]);

  detalleInventario.forEach((producto, index) => {
    producto=producto.dataValues;
    totalProductos+=Math.round(producto.totalMultiplicado);
    tableBody.push([
      producto.idproducto,
      producto.Producto.nombre,
      producto.cantidadTotal ?? 'N/A',
      Math.round(producto.precio).toLocaleString('es-PY') ?? 'N/A',
      Math.round(producto.totalMultiplicado).toLocaleString('es-PY') ?? 'N/A',
    ]);
    
  });

  // console.log(tableBody)

  defaultAlignments =['center', 'left','center','right','right']

  tableBody=tableBody.map((row, rowIndex) => {
    if (rowIndex === 0) {
      // Aplicar alineación predeterminada solo a la cabecera
      return row;
    } else {
      // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
      return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
    }
  })

  //luego de alinear todas las filas añadimos el total
  // Agregar la fila con el total de productos al final
  tableBody.push([
    { text: 'Total', bold:true},
    {},
    {},
    {text:Math.round(totalProductos).toLocaleString('es-PY'),alignment:'right', bold:true, colSpan: 2},
    
  ]);

  const table = {
    table: {
      headerRows: 1,
      widths: ['auto', '*', 50, 80, 80],
      body: tableBody,
      // Establece repeat en false para que la cabecera no se repita en cada página
      repeat: false,
    },
    // layout: 'headerLineOnly'
    layout: 'noBorders',
    // fontSize:12
  };
  
  content.push(table);


  const docDefinition = {
    content,
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          {
            text: fechaHoy, // Agrega la fecha actual a la izquierda
            fontSize:10,
            alignment: 'left',
            margin: [20, 0], // Ajusta el margen izquierdo para alinear a la izquierda
          },
          {
            text: `Página ${currentPage.toString()} de ${pageCount}`,
            fontSize:10,
            alignment: 'right',
            margin: [0, 0, 20, 0], // Ajusta el margen derecho para alinear a la derecha
          },
        ],
        margin: [40, 0], // Ajusta el margen izquierdo y derecho del pie de página
      };
    },
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

const obtenerDetalleInventario = async (req, res) => {
  const idCabecera=req.params.id;
    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:MM:SS');

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

  const [cabecera, detalleInventario] = await Promise.all([
    CInventario.findOne({ 
      where: { idCabecera },
      include:[
        {
          model:Sucursal,
          attributes:['nombre']
        }
      ] 
    }),
    DInventario.findAll({
      where: { idcabecera: idCabecera },
      attributes: [
        'idproducto',
        'cantidadApertura',
        'cantidadCierre',
        'cantidadRecepcion',
        'cantidadSalida',
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
        [{ model: Producto }, 'nombre', 'ASC']
      ]
    }),
  ]);

  const content = [];
  /*
		{
			columns: [
				{
					width: 'auto',
					text: 'val1'
				},
				{
					width: 'auto',
					text: 'val2'
				},
				{
					width: 'auto',
					text: 'value3'
				},
				{
					width: 'auto',
					text: 'value 4'
				},
			]
		},
  */

  // Encabezado del PDF
  const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
  const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
  content.push({ text: 'Detalle de Productos', alignment: 'center', margin:5, bold:true, fontSize:16 });
//   content.push({
// 			columns: [
//         {
//           width: 'auto',
//           text: `Fecha Apertura: ${fechaApertura}`,
//           margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
//         },
// 				{
// 					width: 'auto',
// 					text:  `Fecha Cierre: ${fechaCierre}`
// 				},

// 			],
//       margin:3
// 	})
//   content.push({
//     columns: [
//       {
//         width: 'auto',
//         text: `Sucursal: ${cabecera.Sucursal.nombre}`,
//         margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
//       },
//       {
//         width: 'auto',
//         text:   `Turno: ${cabecera.turno}`
//       },
//     ],
//     margin:3

// })


content.push({
  columns: [
    {
      width: 'auto',
      text: { text: 'Fecha Apertura: ', bold:true},
      margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
    },
    {
      width: 'auto',
      text: fechaApertura,
      margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
    },
    {
      width: 'auto',
      text: { text: 'Fecha Cierre: ', bold:true},
      margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
    },
    {
      width: 'auto',
      text: fechaCierre,
    },
  ],
  margin: 3,
});

content.push({
  columns: [
    {
      width: 'auto',
      text: { text: 'Sucursal: ', bold:true},
      margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
    },
    {
      width: 'auto',
      text: cabecera.Sucursal.nombre,
      margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
    },
    {
      width: 'auto',
      text: { text: 'Turno: ', bold:true},
      margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
    },
    {
      width: 'auto',
      text: cabecera.turno,
    },
  ],
  margin: 3,
});



  content.push('\n');
  /*
  {text: 'noBorders:', fontSize: 14, bold: true, pageBreak: 'before', margin: [0, 0, 0, 8]},
		{
			style: 'tableExample',
			table: {
				headerRows: 1,
				body: [
					[{text: 'Header 1', style: 'tableHeader'}, {text: 'Header 2', style: 'tableHeader'}, {text: 'Header 3', style: 'tableHeader'}],
					['Sample value 1', 'Sample value 2', 'Sample value 3'],
					['Sample value 1', 'Sample value 2', 'Sample value 3'],
					['Sample value 1', 'Sample value 2', 'Sample value 3'],
					['Sample value 1', 'Sample value 2', 'Sample value 3'],
					['Sample value 1', 'Sample value 2', 'Sample value 3'],
				]
			},
			layout: 'noBorders'
		},
  */

  // Tabla de productos
  let tableBody = [];
  // tableBody.push(['IdProd','Nombre', 'Cant. A', 'Cant. C', 'Cant. R', 'Cant. S']);
  // tableBody.push([{text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}]);
  tableBody.push([{text:'Id Prod.', bold:true, alignment:'center'}, {text:'Nombre', bold:true, alignment:'center'}, {text:'Apertura', bold:true, alignment:'center'}, {text:'Cierre', bold:true, alignment:'center'}, {text:'Recep.', bold:true, alignment:'center'}, {text:'Salida', bold:true, alignment:'center'}]);

  detalleInventario.forEach((producto, index) => {
    tableBody.push([
      producto.idproducto,
      producto.Producto.nombre,  // Cambiado de producto.nombre
      producto.cantidadApertura ?? 'N/A',
      producto.cantidadCierre ?? 'N/A',
      producto.cantidadRecepcion ?? 'N/A',
      producto.cantidadSalida ?? 'N/A',
    ]);
  });

  defaultAlignments =['center', 'left','center','center','center','center']
  //para alinear contenido
  // tableBody=tableBody.map(row => row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] })))
  tableBody=tableBody.map((row, rowIndex) => {
    if (rowIndex === 0) {
      // Aplicar alineación predeterminada solo a la cabecera
      return row;
    } else {
      // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
      return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
    }
  })

  console.log(tableBody)

  
  // /tableBody.map(row => row.map(cell => ({ text: cell, alignment: typeof cell === 'number' ? 'center' : 'left' }))),
  //    body: tableBody.map(row => row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }))),

  const table = {
    table: {
      headerRows: 1,
      // widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
      widths: ['auto', '*', 50, 50, 50, 50 ],
      body: tableBody,
      // body: tableBody.map(row => row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }))),
      // Establece repeat en false para que la cabecera no se repita en cada página
      repeat: false,
    },
    alignment: {
      2: 'center', // Índice 2 corresponde a la tercera columna (cantidades)
      3: 'center', // Índice 3 corresponde a la cuarta columna
      4: 'center', // Índice 4 corresponde a la quinta columna
      5: 'center', // Índice 5 corresponde a la sexta columna
    },
    // layout: 'headerLineOnly'
    layout: 'noBorders',
    // fontSize:12
  };
  
  content.push(table);


  const docDefinition = {
    content,
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          {
            text: fechaHoy, // Agrega la fecha actual a la izquierda
            fontSize:10,
            alignment: 'left',
            margin: [20, 0], // Ajusta el margen izquierdo para alinear a la izquierda
          },
          {
            text: `Página ${currentPage.toString()} de ${pageCount}`,
            fontSize:10,
            alignment: 'right',
            margin: [0, 0, 20, 0], // Ajusta el margen derecho para alinear a la derecha
          },
        ],
        margin: [40, 0], // Ajusta el margen izquierdo y derecho del pie de página
      };
    },
  };

  // const pdfDoc = printer.createPdfKitDocument(docDefinition);
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


const obtenerPdfDetalleInventario = async (req, res) => {

  console.log('ontenerPdrdetalleInventario')

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
  obtenerPdfDetalleInventario,


  obtenerDetalleInventario,
  obtenerVentas,
  obtenerRendicion
}

const pdfMake = require('pdfmake');
const fs = require('fs');
const {Clasificacion, Producto ,Usuario, CInventario, Sucursal, DInventario, Dinero, CRecepcion} = require('../model');
//Para transacciones
const sequelize = require('../db/conections');

//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';

const { Sequelize, Op } = require("sequelize");
const DRendicion = require('../model/dRendicion');
const DSalida = require('../model/dSalida');
const CSalida = require('../model/csalida');
const Salida = require('../model/salida');
const DRecepcion = require('../model/dRecepcion');

const obtenerRendicion = async (req, res) => {
  const idCabecera=req.params.id;
  // Obtener la fecha actual según la zona horaria de Paraguay
  const fechaActual = moment().tz(zonaHorariaParaguay);
  // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
  const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');
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

  const [cabecera, detalleRendicion, detalleInventario] = await Promise.all([
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
          'observacion'
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
  }),
  //todo:agregado
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
        [{ model: Producto }, 'nombre', 'ASC'] // Ordena por nombre del Producto en forma ascendente
    ]
})
  ]);
  

//todo:agregado
        // Calcular el totalFinal sumando todos los valores de totalMultiplicado
        const totalVenta = detalleInventario.reduce((total, item) => {
          total += parseFloat(item.dataValues.totalMultiplicado);
          return total;
      }, 0);

  // console.log(detalleInventario)

  // Encabezado del PDF
  const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
  const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
  const sucursal = cabecera.Sucursal.nombre;
  const turno = cabecera.turno;

  const montoApertura=parseInt(cabecera.montoApertura);
  const montoCierre= parseInt(cabecera.montoCierre);
  const montoDiferencia= parseInt(cabecera.montoDiferencia);
  const montoPendiente= parseInt(cabecera.montoPendiente);
  const montoOtrosCobros=  parseInt(cabecera.montoOtrosCobros);
  const observacion= cabecera.observacion;
  
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
      Math.round(billete.cantidadCierre).toLocaleString('es-PY') ?? 'N/A',
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
        text: { text: 'Monto Apertura = ', bold:true},
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
        text: { text: 'Monto Cierre = ', bold:true},
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
        text: { text: 'Monto Diferencia = ', bold:true},
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
        text: { text: 'Otros: Cobro con tarjeta + Creditos a clientes + Pagos realizados = ', bold:true},
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
        text: { text: 'Cobro por créditos anteriores : ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoOtrosCobros).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push('\n')
  
  // console.log('montoDiferencia+montoPendiente-montoOtrosCobros ',montoDiferencia,montoPendiente,montoOtrosCobros)
  
  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Monto del día (monto diferencia + otros - creditos anteriores ) = ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoDiferencia+montoPendiente-montoOtrosCobros).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });
  
  // content.push('\n')

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Ventas del día = ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(totalVenta).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  ////
  content.push('\n')
  content.push({
    text: '---- Observaciones de caja ----',
    bold:true
  })

  detalleRendicion.forEach((billete, index) => {

    desc=billete.Dinero.nombreBillete;
    obs=billete.observacion;

    if(obs!=null && obs.length>2){
      content.push({
        columns: [
          {
            width: 'auto',
            text: { text: `${index+1}. ${desc}: `, bold:true},
            margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
          },
          {
            width: 'auto',
            text: obs,
            margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
          }
        ]
      });
     }
    
  });

  if(observacion!=null && observacion.length>0){

    content.push('\n')
    content.push({
      text: 'OBSERVACION DE LA RENDICION/INVENTARIO: ',
      bold:true
    })

    content.push({
      text: observacion,
      italics: true,
    });
  }  
////
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

const obtenerSalidas = async (req, res) => {
  const idCabecera=req.params.id;
  // Obtener la fecha actual según la zona horaria de Paraguay
  const fechaActual = moment().tz(zonaHorariaParaguay);
  // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
  const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');
  //sumar todos los totales de los productos


  const fonts = {
    Roboto: {
      normal: 'fonts/roboto/Roboto-Regular.ttf',
      bold: 'fonts/roboto/Roboto-Bold.ttf',
      italics: 'fonts/roboto/Roboto-Italic.ttf',
      bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
    }
  };

  const printer = new pdfMake(fonts);

  const [cabecera, detalleSalidas] = await Promise.all([
    CInventario.findOne({
      where: { idCabecera },
      include: [
        {
          model: Sucursal,
          attributes: ['nombre'],
        },
      ],
    }),
    DSalida.findAll({
      where: { },
      include: [
      {
          model: CSalida,
          where: { idcabinventario: idCabecera },
          include: [
              {
                  model:Usuario,
                  attributes:['nombre']
              }
          ],
          attributes:['fecha', 'idCabecera', 'observacion']
      },{
          model: Producto, attributes:[ 'nombre'],
      },{
          model: Salida, attributes:[ 'descripcion']  
      }
      ],
      attributes: ['cantidad', 'idproducto', 'idcsalida', 'total', 
      [
          // sequelize.literal(`(SELECT precio FROM DInventario WHERE DInventario.idproducto = DRecepcion.idproducto AND DInventario.idcabecera=${idCabecera})`),
          

           sequelize.literal(`(SELECT precio FROM dinventario WHERE dinventario.idproducto = Dsalida.idproducto AND dinventario.idcabecera=${idCabecera})`),
          

          'precio'
      ]
  ],
  })
  ]);
  

  // console.log(detalleInventario)

  // Encabezado del PDF
  const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
  const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
  const sucursal = cabecera.Sucursal.nombre;
  const turno = cabecera.turno;

  // console.log('observacion salida ', detalleSalidas)
  //  let observacionSalida= '';
  
  const content = [];
  content.push({ text: 'Salida de Productos', alignment: 'center', margin:5, bold:true, fontSize:16 });

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
  tableBody.push([{text:'IdCab S', bold:true, alignment:'center'},{text:'Producto', bold:true, alignment:'center'}, {text:'Cantidad', bold:true, alignment:'center'}, {text:'Precio', bold:true, alignment:'right'}, {text:'Total', bold:true, alignment:'center'}, {text:'Motivo', bold:true, alignment:'center'}]);

  detalleSalidas.forEach((producto, index) => {
    producto=producto.dataValues;
    // observacionSalida=producto.Csalida.dataValues.observacion;
    // console.log('obs ', )
    tableBody.push([
      // billete.iddinero,
      producto.idcsalida,
      producto.Producto.nombre,
      Math.round(producto.cantidad).toLocaleString('es-PY') ?? 'N/A',
      Math.round(producto.precio).toLocaleString('es-PY') ?? 'N/A',
      Math.round(producto.total).toLocaleString('es-PY') ?? 'N/A',
      producto.Salida.descripcion
    ]);
    
  });

  defaultAlignments =['center', 'left','center','right','right','left']

  tableBody=tableBody.map((row, rowIndex) => {
    if (rowIndex === 0) {
      // Aplicar alineación predeterminada solo a la cabecera
      return row;
    } else {
      // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
      return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
    }
  })

  const table = {
    table: {
      headerRows: 1,
      widths: [50, 180, 50, 60, 80, 100],
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

////////////////////////
const observacionesPorCabecera = new Set(); // Conjunto para almacenar cabeceras únicas
const observaciones = {}; // Objeto para almacenar observaciones por cabecera

detalleSalidas.forEach((producto, index) => {
  producto = producto.dataValues;

  // Almacena la observación asociada a la cabecera en el objeto
  if (!observaciones[producto.idcsalida]) {
    observaciones[producto.idcsalida] = producto.Csalida.observacion || '';
    observacionesPorCabecera.add(producto.idcsalida);
  }

});

// Después de recorrer los detalles, se agrega la observación por cada cabecera única
observacionesPorCabecera.forEach((idCabecera) => {
  const observacion = observaciones[idCabecera];
  if (observacion && observacion.length > 0) {
    content.push('\n');
    content.push({
      text: 'OBSERVACION DE LA SALIDA DE PRODUCTOS (IdCab ' + idCabecera + '):',
      bold: true,
    });

    content.push({
      text: observacion,
      italics: true,
    });
  }
});

///////////////////////
  // if(observacionSalida!=null && observacionSalida.length>0){

  //   content.push('\n')
  //   content.push({
  //     text: 'OBSERVACION DE LA SALIDA DE PRODUCTOS: ',
  //     bold:true
  //   })

  //   content.push({
  //     text: observacionSalida,
  //     italics: true,
  //   });
  // }  
////
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

const obtenerRecepciones = async (req, res) => {
  const idCabecera=req.params.id;
  // Obtener la fecha actual según la zona horaria de Paraguay
  const fechaActual = moment().tz(zonaHorariaParaguay);
  // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
  const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');
  //sumar todos los totales de los productos


  const fonts = {
    Roboto: {
      normal: 'fonts/roboto/Roboto-Regular.ttf',
      bold: 'fonts/roboto/Roboto-Bold.ttf',
      italics: 'fonts/roboto/Roboto-Italic.ttf',
      bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
    }
  };

  const printer = new pdfMake(fonts);

  const [cabecera, detalleRecepciones] = await Promise.all([
    CInventario.findOne({
      where: { idCabecera },
      include: [
        {
          model: Sucursal,
          attributes: ['nombre'],
        },
      ],
    }),
    DRecepcion.findAll({//se obtiene el precio del producto de dinventario pq es el que se utiliza durante la vigencia del inventario
      where: {
      },
      include: [
          {
              model: CRecepcion,
              where: { idcabinventario: idCabecera },
              include: [
              {
                  model:Usuario,
                  attributes:['nombre']
              }
              ],
              attributes:['fecha', 'observacion', 'nroComprobante', 'estado']
          },
          {
              model: Producto,
              attributes: ['nombre'],
          
          }
      ],
      attributes: ['cantidad', 'idproducto', 'idcrecepcion', 'total', 
          [
              // sequelize.literal(`(SELECT precio FROM DInventario WHERE DInventario.idproducto = DRecepcion.idproducto AND DInventario.idcabecera=${idCabecera})`),
              

               sequelize.literal(`(SELECT precio FROM dinventario WHERE dinventario.idproducto = Drecepcion.idproducto AND dinventario.idcabecera=${idCabecera})`),
              

              'precio'
           ]
      ],
  })
  ]);
  

  // console.log(detalleRecepciones)

  // Encabezado del PDF
  const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
  const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
  const sucursal = cabecera.Sucursal.nombre;
  const turno = cabecera.turno;

  // console.log('observacion salida ', detalleSalidas)
  //  let observacionRecepcion= '';
  
  const content = [];
  content.push({ text: 'Recepción de Productos', alignment: 'center', margin:5, bold:true, fontSize:16 });

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
  tableBody.push([{text:'IdCab R', bold:true, alignment:'center'},{text:'Producto', bold:true, alignment:'center'}, {text:'Cantidad', bold:true, alignment:'center'}, {text:'Precio', bold:true, alignment:'right'}, {text:'Total', bold:true, alignment:'center'}, {text:'NroComp', bold:true, alignment:'center'}, {text:'Activo', bold:true, alignment:'center'}]);

  detalleRecepciones.forEach((producto, index) => {
    producto=producto.dataValues;
    // observacionRecepcion=producto.Crecepcion.dataValues.observacion;
    // console.log('obs ', )
    tableBody.push([
      // billete.iddinero,
      producto.idcrecepcion,
      producto.Producto.nombre,
      Math.round(producto.cantidad).toLocaleString('es-PY') ?? 'N/A',
      Math.round(producto.precio).toLocaleString('es-PY') ?? 'N/A',
      Math.round(producto.total).toLocaleString('es-PY') ?? 'N/A',
      producto.Crecepcion.nroComprobante,
      producto.Crecepcion.estado ? 'Sí' : 'No'  // Expresión condicional para asignar "Sí" o "No"
    ]);
    
  });

  defaultAlignments =['center', 'left','center','right','right','center','center']

  tableBody=tableBody.map((row, rowIndex) => {
    if (rowIndex === 0) {
      // Aplicar alineación predeterminada solo a la cabecera
      return row;
    } else {
      // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
      return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
    }
  })

  const table = {
    table: {
      headerRows: 1,
      widths: ['*',180, 50, 60, 80, 55, 55],
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

////////////////////////
  const observacionesPorCabecera = new Set(); // Conjunto para almacenar cabeceras únicas
  const observaciones = {}; // Objeto para almacenar observaciones por cabecera

  detalleRecepciones.forEach((producto, index) => {
    producto = producto.dataValues;

    // Almacena la observación asociada a la cabecera en el objeto
    if (!observaciones[producto.idcrecepcion]) {
      observaciones[producto.idcrecepcion] = producto.Crecepcion.observacion || '';
      observacionesPorCabecera.add(producto.idcrecepcion);
    }
  });

  // Después de recorrer los detalles, se agrega la observación por cada cabecera única
  observacionesPorCabecera.forEach((idCabecera) => {
    const observacion = observaciones[idCabecera];
    if (observacion && observacion.length > 0) {
      content.push('\n');
      content.push({
        text: 'OBSERVACION DE LA RECEPCION DE PRODUCTOS (IdCab ' + idCabecera + '):',
        bold: true,
      });

      content.push({
        text: observacion,
        italics: true,
      });
    }
  });


////////////////////
  // if(observacionRecepcion!=null && observacionRecepcion.length>0){

  //   content.push('\n')
  //   content.push({
  //     text: 'OBSERVACION DE LA RECEPCION DE PRODUCTOS: ',
  //     bold:true
  //   })

  //   content.push({
  //     text: observacionRecepcion,
  //     italics: true,
  //   });
  // }  


////
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
  const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');
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

  /////////////
  const montoApertura=parseInt(cabecera.montoApertura);
  const montoCierre= parseInt(cabecera.montoCierre);
  const montoDiferencia= parseInt(cabecera.montoDiferencia);
  const montoPendiente= parseInt(cabecera.montoPendiente);
  const montoOtrosCobros=  parseInt(cabecera.montoOtrosCobros);
  const observacion= cabecera.observacion;
  /////////////
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
  tableBody.push([{text:'Id Prod.', bold:true, alignment:'center'}, {text:'Nombre', bold:true, alignment:'center'}, {text:'Cantidad', bold:true, alignment:'center'}, {text:'Precio', bold:true, alignment:'right'}, {text:'Total Prod.', bold:true, alignment:'right'}]);

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
    { text: 'Total Venta', bold:true},
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

  content.push('\n')

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Monto Apertura = ', bold:true},
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
        text: { text: 'Monto Cierre = ', bold:true},
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
        text: { text: 'Monto Diferencia = ', bold:true},
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
        text: { text: 'Otros: Cobro con tarjeta + Creditos a clientes + Pagos realizados = ', bold:true},
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
        text: { text: 'Cobro por créditos anteriores : ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoOtrosCobros).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push('\n')
  
  // console.log('montoDiferencia+montoPendiente-montoOtrosCobros ',montoDiferencia,montoPendiente,montoOtrosCobros)
  
  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: '==> Monto del día (monto diferencia + otros - creditos anteriores ) = ', bold:true},
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoDiferencia+montoPendiente-montoOtrosCobros).toLocaleString('es-PY')?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });


  ////
  content.push('\n')


  if(observacion!=null && observacion.length>0){

    content.push('\n')
    content.push({
      text: 'OBSERVACION DE LA RENDICION/INVENTARIO: ',
      bold:true
    })

    content.push({
      text: observacion,
      italics: true,
    });
  }  
////

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
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');

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
  const observacion = cabecera.observacion;
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
// console.log(detalleInventario)

  // Tabla de productos
  let tableBody = [];
  // tableBody.push(['IdProd','Nombre', 'Cant. A', 'Cant. C', 'Cant. R', 'Cant. S']);
  // tableBody.push([{text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}]);
  tableBody.push([{text:'Id Prod.', bold:true, alignment:'center'}, {text:'Nombre', bold:true, alignment:'center'}, {text:'Apert.', bold:true, alignment:'center'}, {text:'Cierre', bold:true, alignment:'center'}, {text:'Recep.', bold:true, alignment:'center'}, {text:'Salida', bold:true, alignment:'center'},  {text:'Venta', bold:true, alignment:'center'}]);

  detalleInventario.forEach((producto, index) => {
    // console.log('------')
    // console.log(producto.dataValues)
    producto = producto.dataValues
    tableBody.push([
      producto.idproducto,
      producto.Producto.nombre,  // Cambiado de producto.nombre
      producto.cantidadApertura ?? 'N/A',
      producto.cantidadCierre ?? 'N/A',
      producto.cantidadRecepcion ?? 'N/A',
      producto.cantidadSalida ?? 'N/A',
      producto.cantidadTotal ?? 'N/A',
    ]);
  });

  defaultAlignments =['center', 'left','center','center','center','center','center']
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


  
  // /tableBody.map(row => row.map(cell => ({ text: cell, alignment: typeof cell === 'number' ? 'center' : 'left' }))),
  //    body: tableBody.map(row => row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }))),

  const table = {
    table: {
      headerRows: 1,
      // widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
      widths: ['auto', '*', 40, 40, 40, 40, 40 ],
      body: tableBody,
      // body: tableBody.map(row => row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }))),
      // Establece repeat en false para que la cabecera no se repita en cada página
    },
    // layout: 'headerLineOnly'
    layout: 'noBorders',
    // fontSize:12
  };
  
  content.push(table);

  if(observacion!=null && observacion.length>0){
    content.push('\n')
    content.push({
      text: 'OBSERVACION DE LA RENDICION/INVENTARIO: ',
      bold:true
    })

    content.push({
      text: observacion,
      italics:true
    })
  }

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


// const inventariosConsecutivos = async (req, res) =>{

//   const {idSucursal, turno1, fecha1, turno2, fecha2} = req.body;

//   console.log('idSucursal, turno1, fecha1, turno2, fecha2 ', idSucursal, turno1, fecha1, turno2, fecha2)
//   let productosComparados = [];

//     // Obtener la fecha actual según la zona horaria de Paraguay
//     const fechaActual = moment().tz(zonaHorariaParaguay);
//     // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
//     const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');
//   const fonts = {
//     Roboto: {
//       normal: 'fonts/roboto/Roboto-Regular.ttf',
//       bold: 'fonts/roboto/Roboto-Bold.ttf',
//       italics: 'fonts/roboto/Roboto-Italic.ttf',
//       bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
//     }
//   };

//   const printer = new pdfMake(fonts);

//   const content = [];

//   content.push({ text: 'Comparación de inventarios', alignment: 'center', margin:5, bold:true, fontSize:16 });

//   // Obtener los detalles de inventario correspondientes
//   const productos = await Producto.findAll({
//     where: {
//       //incluso los productos inactivos
//     },
//   });

//   // Obtener los inventarios consecutivos basados en las fechas, turnos y sucursal
// const inventariosConsecutivos = await CInventario.findAll({
//   where: {
//     idsucursal: idSucursal,
//     fechaApertura: {
//       [Op.between]: [fecha1, fecha2],
//     },
//     turno: {
//       [Op.in]: [turno1, turno2],
//     },
//   },
//   order: [
//     ['fechaApertura', 'ASC'],
//     ['turno', 'ASC'],
//   ],
// });

// // console.log(inventariosConsecutivos)
// // console.log('--------------------')
// // console.log(inventariosConsecutivos[0])
// // console.log(inventariosConsecutivos[1])


// // Obtener los detalles de inventario correspondientes
// const detallesInventarioActual = await DInventario.findAll({
//   where: {
//     idcabecera: inventariosConsecutivos[0].idCabecera, // IdCabecera para el detalleActual
//   },
// });

// const detallesInventarioSiguiente = await DInventario.findAll({
//   where: {
//     idcabecera: inventariosConsecutivos[1].idCabecera, // IdCabecera para el detalleSiguiente
//   },
// });

// // Iterar sobre los productos
//  productosComparados = productos.map((producto) => {
//   // Encontrar el detalle del inventario actual para el producto actual
//   const detalleActual = detallesInventarioActual.find(
//     (detalle) => detalle.idproducto === producto.id
//   );

//   // Encontrar el detalle del inventario siguiente para el producto actual
//   const detalleSiguiente = detallesInventarioSiguiente.find(
//     (detalle) => detalle.idproducto === producto.id
//   );

//   return {
//     idProducto: producto.idProducto,
//     nombre: producto.nombre,
//     cantidadAnterior: detalleActual ? detalleActual.cantidadCierre : 0,
//     cantidadSiguiente: detalleSiguiente ? detalleSiguiente.cantidadApertura : 0,
//   };
// });

// // console.log('Productos comparados:', productosComparados);


// // console.log('Productos comparados:', productosComparados);

//   let tableBody = [];
//   // tableBody.push(['IdProd','Nombre', 'Cant. A', 'Cant. C', 'Cant. R', 'Cant. S']);
//   // tableBody.push([{text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}, {text:'Producto', bold:true}]);
//   tableBody.push([{text:'Id Prod.', bold:true, alignment:'center'}, {text:'Nombre', bold:true, alignment:'center'}, {text:'Anterior', bold:true, alignment:'center'}, {text:'Siguiente', bold:true, alignment:'center'}]);

//   productosComparados.forEach((producto, index) => {
//     tableBody.push([
//       producto.idProducto,
//       producto.nombre,  // Cambiado de producto.nombre
//       producto.cantidadAnterior ?? 'N/A',
//       producto.cantidadSiguiente ?? 'N/A',
//     ]);
//   });

//   defaultAlignments =['center', 'left','center','center']
//   //para alinear contenido
//   // tableBody=tableBody.map(row => row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] })))
//   tableBody=tableBody.map((row, rowIndex) => {
//     if (rowIndex === 0) {
//       // Aplicar alineación predeterminada solo a la cabecera
//       return row;
//     } else {
//       // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
//       return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
//     }
//   })

//   const table = {
//     table: {
//       headerRows: 1,
//       widths: ['auto', '*', 50, 50 ],
//       body: tableBody,
//     },
//     layout: 'noBorders',
//   };
  
//   content.push(table);


//   const docDefinition = {
//     content,
//     footer: function(currentPage, pageCount) {
//       return {
//         columns: [
//           {
//             text: fechaHoy, // Agrega la fecha actual a la izquierda
//             fontSize:10,
//             alignment: 'left',
//             margin: [20, 0], // Ajusta el margen izquierdo para alinear a la izquierda
//           },
//           {
//             text: `Página ${currentPage.toString()} de ${pageCount}`,
//             fontSize:10,
//             alignment: 'right',
//             margin: [0, 0, 20, 0], // Ajusta el margen derecho para alinear a la derecha
//           },
//         ],
//         margin: [40, 0], // Ajusta el margen izquierdo y derecho del pie de página
//       };
//     },
//   };

//   // const pdfDoc = printer.createPdfKitDocument(docDefinition);
//   const pdfDoc = printer.createPdfKitDocument(docDefinition);

//   // Convertir el PDF a una respuesta streamable
//   const chunks = [];
//   pdfDoc.on('data', (chunk) => chunks.push(chunk));
//   pdfDoc.on('end', () => {
//     const pdfData = Buffer.concat(chunks);

//     // Enviar el PDF como respuesta al cliente
//     res.setHeader('Content-Type', 'application/pdf');
//     // PARA DESCARGAR DIRECTAMENTE EL PDF
//     res.setHeader('Content-Disposition', 'attachment; filename="productos.pdf"');

//     res.send(pdfData);
//   });

//   pdfDoc.end();

// }

const inventariosConsecutivos = async (req, res) => {

  const fonts = {
    Roboto: {
      normal: 'fonts/roboto/Roboto-Regular.ttf',
      bold: 'fonts/roboto/Roboto-Bold.ttf',
      italics: 'fonts/roboto/Roboto-Italic.ttf',
      bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
    }
  };

  const printer = new pdfMake(fonts);


  try {
    const { idSucursal, turno1, fecha1, turno2, fecha2 } = req.query;

    console.log('idSucursal, turno1, fecha1, turno2, fecha2 ', idSucursal, turno1, fecha1, turno2, fecha2);

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');

    const fecha1Formatted = moment(fecha1).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const fecha2Formatted = moment(fecha2).endOf('day').format('YYYY-MM-DD HH:mm:ss');
    let nombreSucursal = '';


    // Obtener los detalles de inventario correspondientes
    const productos = await Producto.findAll({
      where: {
        // Incluso los productos inactivos
      },
    });

    // Obtener los inventarios consecutivos basados en las fechas, turnos y sucursal
    const inventariosConsecutivos = await CInventario.findAll({
      where: {
        idsucursal: idSucursal,
        fechaApertura: {
          [Op.between]: [fecha1Formatted, fecha2Formatted],
          // [Op.gte]: fecha1,  // Fecha mayor o igual a fecha1
          // [Op.lte]: fecha2,  // Fecha menor o igual a fecha2
        },
        turno: {
          [Op.in]: [turno1, turno2],
        },
      },
      include:[
        {
          model:Sucursal,
          attributes:['nombre']
        }
      ],
      order: [
        ['fechaApertura', 'ASC'],
        ['turno', 'ASC'],
      ],
    });

    if (inventariosConsecutivos.length < 2) {
       return res.status(501).json({ msg: 'No hay suficientes inventarios consecutivos para comparar.' });
      // throw new Error(`Datos insuficientes`);
    }

    nombreSucursal = inventariosConsecutivos[0].Sucursal.nombre;

    // Obtener los detalles de inventario correspondientes
    const detallesInventarioActual = await DInventario.findAll({
      where: {
        idcabecera: inventariosConsecutivos[0].idCabecera, // IdCabecera para el detalleActual
      },
    });

    const detallesInventarioSiguiente = await DInventario.findAll({
      where: {
        idcabecera: inventariosConsecutivos[1].idCabecera, // IdCabecera para el detalleSiguiente
      },
    });

  // Filtrar productos que tienen entradas en detallesInventarioActual o detallesInventarioSiguiente
  const productosComparados = productos.filter((producto) => {
    const detalleActual = detallesInventarioActual.find((detalle) => detalle.idproducto === producto.idProducto);
    const detalleSiguiente = detallesInventarioSiguiente.find((detalle) => detalle.idproducto === producto.idProducto);
    return detalleActual || detalleSiguiente;
  }).map((producto) => ({
    idProducto: producto.idProducto,
    nombre: producto.nombre,
    cantidadAnterior: detallesInventarioActual.find((detalle) => detalle.idproducto === producto.idProducto)?.cantidadCierre ?? 'N/A',
    cantidadSiguiente: detallesInventarioSiguiente.find((detalle) => detalle.idproducto === producto.idProducto)?.cantidadApertura ?? 'N/A',
  }));

    let tableBody = [];
    tableBody.push([{ text: 'Id Prod.', bold: true, alignment: 'center' }, { text: 'Nombre', bold: true, alignment: 'center' }, { text: 'Cierre Fecha1', bold: true, alignment: 'center' }, { text: 'Apertura Fecha2', bold: true, alignment: 'center' }]);

    productosComparados.forEach((producto, index) => {

      // if(isNaN(producto.cantidadAnterior) || isNaN(producto.cantidadSiguiente)){
        tableBody.push([
          producto.idProducto,
          producto.nombre,
          producto.cantidadAnterior ?? 'N/A',
          producto.cantidadSiguiente ?? 'N/A',
        ]);

      // }
    });

    const defaultAlignments = ['center', 'left', 'center', 'center'];
    tableBody = tableBody.map((row, rowIndex) => {
      if (rowIndex === 0) {
        // Aplicar alineación predeterminada solo a la cabecera
        return row;
      } else {
        // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
        return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
      }
    });

    const content = [];
    content.push({ text: 'Comparación de Cantidades de Inventarios', alignment: 'center', margin: 5, bold: true, fontSize: 16 });

    const table = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 50, 50],
        body: tableBody,
      },
      layout: 'noBorders',
   
    }

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Sucursal: ', bold:true},
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: nombreSucursal,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },

      ],
      margin: 3,
    });


    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Fecha 1: ', bold:true},
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: moment(fecha1Formatted).format('DD-MM-YYYY'),
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno 1: ', bold:true},
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: turno1,
        },
      ],
      margin: 3,
    });
    
    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Fecha 2: ', bold:true},
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: moment(fecha2Formatted).format('DD-MM-YYYY'),
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno 2: ', bold:true},
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: turno2,
        },
      ],
      margin: 3,
    });
    
    content.push('\n');

    content.push(table);

    const docDefinition = {
      content,
      footer: function (currentPage, pageCount) {
        return {
          columns: [
            {
              text: fechaHoy, // Agrega la fecha actual a la izquierda
              fontSize: 10,
              alignment: 'left',
              margin: [20, 0], // Ajusta el margen izquierdo para alinear a la izquierda
            },
            {
              text: `Página ${currentPage.toString()} de ${pageCount}`,
              fontSize: 10,
              alignment: 'right',
              margin: [0, 0, 20, 0], // Ajusta el margen derecho para alinear a la derecha
            },
          ],
          margin: [40, 0], // Ajusta el margen izquierdo y derecho del pie de página
        };
      },
    };

    // Crear el PDF
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
      // res.status(200).json(pdfData);
    });
    
    pdfDoc.end();
  } catch (error) {
    // res.setHeader('Content-Type', 'application/json');
    console.error('Error en el controlador inventariosConsecutivos:', error);
    res.status(500).json({msg: 'Error al obtener el pdf '});
  }
};


module.exports = {
  obtenerDetalleInventario,
  obtenerVentas,
  obtenerRendicion,
  obtenerSalidas,
  obtenerRecepciones,
  inventariosConsecutivos
}

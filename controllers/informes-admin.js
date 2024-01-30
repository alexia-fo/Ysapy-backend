const pdfMake = require('pdfmake');
const fs = require('fs');
//Para transacciones
const sequelize = require('../db/conections');
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';

const { Producto, Usuario, CInventario, Sucursal, DInventario, Dinero, CRecepcion, Drendicion } = require('../model');
const { Sequelize, Op } = require("sequelize");
const DRendicion = require('../model/dRendicion');
const DRecepcion = require('../model/dRecepcion');
const DSalida = require('../model/dSalida');
const CSalida = require('../model/csalida');
const Salida = require('../model/salida');

const obtenerRendicion = async (req, res) => {

  try {

    //VARIABLES

    //id de cinventario en bd
    const idCabecera = req.params.id;

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');

    //fuente para el pdf
    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };
    const printer = new pdfMake(fonts);

    //CONSULTAS --> consultamos las tres tablas al mismo tiempo
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
      })
    ]);

    // Calcular el Total final con los subtotales de las ventas 
    const totalVenta = detalleInventario.reduce((total, item) => {
      total += parseFloat(item.dataValues.totalMultiplicado);
      return total;
    }, 0);

    // ENCABEZADO DEL PDF
    const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
    const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
    const sucursal = cabecera.Sucursal.nombre || 'n/a';
    const turno = cabecera.turno || 'n/a';
    const observacion = cabecera.observacion || 'n/a';
    //conviene usar isNaN pq 0 se puede interpretar como false
    const montoApertura = !isNaN(cabecera.montoApertura) ? parseInt(cabecera.montoApertura) : 'n/a';
    const montoCierre = !isNaN(cabecera.montoCierre) ? parseInt(cabecera.montoCierre) : 'n/a';
    const montoDiferencia = !isNaN(cabecera.montoDiferencia) ? parseInt(cabecera.montoDiferencia) : 'n/a';
    const montoPendiente = !isNaN(cabecera.montoPendiente) ? parseInt(cabecera.montoPendiente) : 'n/a';
    const montoOtrosCobros = !isNaN(cabecera.montoOtrosCobros) ? parseInt(cabecera.montoOtrosCobros) : 'n/a';


    const content = [];
    content.push({ text: 'Rendición de Caja', alignment: 'center', margin: 5, bold: true, fontSize: 16 });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Fecha Apertura: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: fechaApertura,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Fecha Cierre: ', bold: true },
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
          text: { text: 'Sucursal: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: sucursal,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno: ', bold: true },
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

    // TABLA 

    let tableBody = [];
    //Encabezado de la tabla
    tableBody.push([{ text: 'Descripción', bold: true, alignment: 'left' }, { text: 'Monto', bold: true, alignment: 'right' }, { text: 'Cant. Apt.', bold: true, alignment: 'center' }, { text: 'Cant. Cier.', bold: true, alignment: 'center' }, { text: 'Tot. Apt.', bold: true, alignment: 'right' }, { text: 'Tot. Cier.', bold: true, alignment: 'right' }]);

    //cuerpo de la tabla
    detalleRendicion.forEach((billete, index) => {
      tableBody.push([
        billete.Dinero.nombreBillete,
        Math.round(billete.Dinero.monto).toLocaleString('es-PY'),
        billete.cantidadApertura ?? 'N/A',
        Math.round(billete.cantidadCierre).toLocaleString('es-PY') ?? 'N/A',
        Math.round(billete.totalApertura).toLocaleString('es-PY') ?? 'N/A',
        Math.round(billete.totalCierre).toLocaleString('es-PY') ?? 'N/A',
      ]);
    });

    //ALINEAMIENTOS DE LA TABLA
    defaultAlignments = ['left', 'right', 'center', 'center', 'right', 'right']

    tableBody = tableBody.map((row, rowIndex) => {
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
        widths: ['*', 60, 60, 60, 80, 80],
        body: tableBody,
      },
      // layout: 'headerLineOnly'
      layout: 'noBorders',
      // fontSize:12
    };

    content.push(table);

    content.push('\n')

    //TOTALES Y RESUMENES DE RESULTADOS

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Monto Apertura = ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: Math.round(montoApertura).toLocaleString('es-PY') ?? 'N/A',
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        }
      ]
    });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Monto Cierre = ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: Math.round(montoCierre).toLocaleString('es-PY') ?? 'N/A',
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        }
      ]
    });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Monto Diferencia = ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: Math.round(montoDiferencia).toLocaleString('es-PY') ?? 'N/A',
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        }
      ]
    });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Otros: Cobro con tarjeta + Creditos a clientes + Pagos realizados = ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: Math.round(montoPendiente).toLocaleString('es-PY') ?? 'N/A',
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        }
      ]
    });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Cobro por créditos anteriores : ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: Math.round(montoOtrosCobros).toLocaleString('es-PY') ?? 'N/A',
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        }
      ]
    });

    content.push('\n')

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'INGRESO POR VENTAS DEL DIA (dif. efe. + otras formas cobro - créditos anter.) = ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: Math.round(montoDiferencia + montoPendiente - montoOtrosCobros).toLocaleString('es-PY') ?? 'N/A',
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        }
      ]
    });

    
    // content.push('\n')

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'TOTAL COBRADO EN EL DIA = ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: Math.round(montoDiferencia + montoPendiente - montoOtrosCobros).toLocaleString('es-PY') ?? 'N/A',
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        }
      ]
    });
    
    content.push('\n')
  
    content.push({text:' ----> Resumen de Ventas ' , bold:true})
    
  
    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Total Ventas del día = ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: Math.round(totalVenta).toLocaleString('es-PY') ?? 'N/A',
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        }
      ]
    });



    content.push('\n')

    // OBSERVACIONES DE CADA UNO DE LOS BILLETES
    content.push({
      text: '----> Observaciones de caja',
      bold: true
    })

    detalleRendicion.forEach((billete, index) => {

      desc = billete.Dinero.nombreBillete;
      obs = billete.observacion;

      //si no hay observacion o solo tiene el guion para concatenar la obs de la apt y el cierre no imprimir
      if (obs != null && obs.length > 2) {
        content.push({
          columns: [
            {
              width: 'auto',
              text: { text: `${index + 1}. ${desc}: `, bold: true },
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

    //OBSERVACION DE LA CABECERA DEL DETALLE DE RENDICION E INVENTARIO
    if (observacion != null && observacion.length > 0) {

      content.push('\n')
      content.push({
        text: '---> OBSERVACION DE LA RENDICION/INVENTARIO ',
        bold: true
      })

      content.push({
        text: observacion,
        italics: true,
      });
    }

    //EL PIE DE LA PAGINA
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: 'Error al generar el pdf de rendicion' });
  }
};

const obtenerDetalleInventario = async (req, res) => {
  try {
    //VARIABLES

    //id de cinventario en bd
    const idCabecera = req.params.id;

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');

    //fuentes para el pdf
    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };

    const printer = new pdfMake(fonts);

    //CONSULTAS --> consultamos las tres tablas al mismo tiempo
    const [cabecera, detalleInventario] = await Promise.all([
      CInventario.findOne({
        where: { idCabecera },
        include: [
          {
            model: Sucursal,
            attributes: ['nombre']
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

    // Encabezado del PDF
    const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
    const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
    const sucursal = cabecera.Sucursal.nombre || 'n/a';
    const turno = cabecera.turno || 'n/a';
    const observacion = cabecera.observacion || 'n/a';

    const content = [];
    content.push({ text: 'Detalle de Productos', alignment: 'center', margin: 5, bold: true, fontSize: 16 });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Fecha Apertura: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: fechaApertura,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Fecha Cierre: ', bold: true },
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
          text: { text: 'Sucursal: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: sucursal,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno: ', bold: true },
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

    //TABLA

    // Tabla de productos
    let tableBody = [];

    //encabezado de la tabla
    tableBody.push([{ text: 'Id Prod.', bold: true, alignment: 'center' }, { text: 'Nombre', bold: true, alignment: 'center' }, { text: 'Apert.', bold: true, alignment: 'center' }, { text: 'Cierre', bold: true, alignment: 'center' }, { text: 'Recep.', bold: true, alignment: 'center' }, { text: 'Salida', bold: true, alignment: 'center' }, { text: 'Venta', bold: true, alignment: 'center' }]);

    //cuerpo de la tabla
    detalleInventario.forEach((producto, index) => {

      producto = producto.dataValues
      tableBody.push([
        producto.idproducto,
        producto.Producto.nombre,
        producto.cantidadApertura ?? 'N/A',
        producto.cantidadCierre ?? 'N/A',
        producto.cantidadRecepcion ?? 'N/A',
        producto.cantidadSalida ?? 'N/A',
        producto.cantidadTotal ?? 'N/A',
      ]);
    });

    //ALINEAMIENTOS DE LA TABLA
    defaultAlignments = ['center', 'left', 'center', 'center', 'center', 'center', 'center']

    tableBody = tableBody.map((row, rowIndex) => {
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
        widths: ['auto', '*', 40, 40, 40, 40, 40],
        body: tableBody,
      },
      // layout: 'headerLineOnly'
      layout: 'noBorders',
      // fontSize:12
    };

    content.push(table);

    content.push('\n')

    if (observacion != null && observacion.length > 0) {
      content.push('\n')
      content.push({
        text: '--- OBSERVACION DE LA RENDICION/INVENTARIO --- ',
        bold: true
      })

      content.push({
        text: observacion,
        italics: true
      })
    }

    //EL PIE DE LA PAGINA
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: 'Error al generar el pdf de inventario' });
  }
};

const obtenerSalidas = async (req, res) => {
  try {
    //VARIABLES
    const idCabecera = req.params.id;

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');
    //sumar todos los totales de los productos

    //fuente para el pdf
    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };

    const printer = new pdfMake(fonts);

    //CONSULTAS 
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
        where: {},
        include: [
          {
            model: CSalida,
            where: { idcabinventario: idCabecera },
            include: [
              {
                model: Usuario,
                attributes: ['nombre']
              }
            ],
            attributes: ['fecha', 'idCabecera', 'observacion']
          }, {
            model: Producto, attributes: ['nombre'],
          }, {
            model: Salida, attributes: ['descripcion']
          }
        ],
        attributes: ['cantidad', 'idproducto', 'idcsalida', 'total',
          [
            //genera error 
            // sequelize.literal(`(SELECT precio FROM DInventario WHERE DInventario.idproducto = DRecepcion.idproducto AND DInventario.idcabecera=${idCabecera})`),

            sequelize.literal(`(SELECT precio FROM dinventario WHERE dinventario.idproducto = Dsalida.idproducto AND dinventario.idcabecera=${idCabecera})`),

            'precio'
          ]
        ],
      })
    ]);

    // ENCABEZADO DEL PDF
    const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
    const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
    const sucursal = cabecera.Sucursal.nombre || 'n/a';
    const turno = cabecera.turno || 'n/a';

    const content = [];
    content.push({ text: 'Salida de Productos', alignment: 'center', margin: 5, bold: true, fontSize: 16 });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Fecha Apertura: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: fechaApertura,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Fecha Cierre: ', bold: true },
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
          text: { text: 'Sucursal: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: sucursal,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno: ', bold: true },
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

    // TABLA
    let tableBody = [];

    //encabezado de la tabla
    tableBody.push([{ text: 'IdCab S', bold: true, alignment: 'center' }, { text: 'Producto', bold: true, alignment: 'center' }, { text: 'Cantidad', bold: true, alignment: 'center' }, { text: 'Precio', bold: true, alignment: 'right' }, { text: 'Total', bold: true, alignment: 'center' }, { text: 'Motivo', bold: true, alignment: 'center' }]);

    //cuerpo de la tabla
    detalleSalidas.forEach((producto, index) => {
      producto = producto.dataValues;
      tableBody.push([
        producto.idcsalida,
        producto.Producto.nombre,
        Math.round(producto.cantidad).toLocaleString('es-PY') ?? 'N/A',
        Math.round(producto.precio).toLocaleString('es-PY') ?? 'N/A',
        Math.round(producto.total).toLocaleString('es-PY') ?? 'N/A',
        producto.Salida.descripcion
      ]);

    });

    //ALIENEAMIENTOS DE LA TABLA
    defaultAlignments = ['center', 'left', 'center', 'right', 'right', 'left']

    tableBody = tableBody.map((row, rowIndex) => {
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
      },
      // layout: 'headerLineOnly'
      layout: 'noBorders',
      // fontSize:12
    };

    content.push(table);

    content.push('\n')

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

    //EL PIE DE PAGINA
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: 'Error al generar el pdf de salidas' });
  }
};

const obtenerRecepciones = async (req, res) => {
  try {
    //VARIABLES

    //id de civnetario en bd
    const idCabecera = req.params.id;
    
    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');
    //sumar todos los totales de los productos

    //fuentes para el pdf
    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };

    const printer = new pdfMake(fonts);

    //CONSULTAS
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
                model: Usuario,
                attributes: ['nombre']
              }
            ],
            attributes: ['fecha', 'observacion', 'nroComprobante', 'estado']
          },
          {
            model: Producto,
            attributes: ['nombre'],

          }
        ],
        attributes: ['cantidad', 'idproducto', 'idcrecepcion', 'total',
          [
            //genera error
            // sequelize.literal(`(SELECT precio FROM DInventario WHERE DInventario.idproducto = DRecepcion.idproducto AND DInventario.idcabecera=${idCabecera})`),
            sequelize.literal(`(SELECT precio FROM dinventario WHERE dinventario.idproducto = Drecepcion.idproducto AND dinventario.idcabecera=${idCabecera})`),

            'precio'
          ]
        ],
      })
    ]);

    // ENCABEZADO DEL PDF
    const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
    const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
    const sucursal = cabecera.Sucursal.nombre || 'n/a';
    const turno = cabecera.turno || 'n/a';

    const content = [];
    content.push({ text: 'Recepción de Productos', alignment: 'center', margin: 5, bold: true, fontSize: 16 });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Fecha Apertura: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: fechaApertura,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Fecha Cierre: ', bold: true },
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
          text: { text: 'Sucursal: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: sucursal,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno: ', bold: true },
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

    //TABLA

    let tableBody = [];
    //encabezado de la tabla
    tableBody.push([{ text: 'IdCab R', bold: true, alignment: 'center' }, { text: 'Producto', bold: true, alignment: 'center' }, { text: 'Cantidad', bold: true, alignment: 'center' }, { text: 'Precio', bold: true, alignment: 'right' }, { text: 'Total', bold: true, alignment: 'center' }, { text: 'NroComp', bold: true, alignment: 'center' }, { text: 'Activo', bold: true, alignment: 'center' }]);

    //cuerpo de la tabla
    detalleRecepciones.forEach((producto, index) => {
      producto = producto.dataValues;
      tableBody.push([
        producto.idcrecepcion,
        producto.Producto.nombre,
        Math.round(producto.cantidad).toLocaleString('es-PY') ?? 'N/A',
        Math.round(producto.precio).toLocaleString('es-PY') ?? 'N/A',
        Math.round(producto.total).toLocaleString('es-PY') ?? 'N/A',
        producto.Crecepcion.nroComprobante,
        producto.Crecepcion.estado ? 'Sí' : 'No'  // Expresión condicional para asignar "Sí" o "No"
      ]);

    });

    //ALINEAMIENTOS DE LA TABLA
    defaultAlignments = ['center', 'left', 'center', 'right', 'right', 'center', 'center']

    tableBody = tableBody.map((row, rowIndex) => {
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
        widths: ['*', 180, 50, 60, 80, 55, 55],
        body: tableBody,
      },
      // layout: 'headerLineOnly'
      layout: 'noBorders',
      // fontSize:12
    };

    content.push(table);

    content.push('\n')

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
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: 'Error al generar el pdf de recepciones' });
  }
};

const obtenerVentas = async (req, res) => {
  try {
    //VARIABLES
    
    //id cinventario en bd
    const idCabecera = req.params.id;
    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');
    //sumar todos los totales de los productos
    let totalProductos = 0;

    //fuente del pdf
    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };

  const printer = new pdfMake(fonts);

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

  // Encabezado del PDF
  const fechaApertura = cabecera.fechaApertura ? moment(cabecera.fechaApertura).format('DD/MM/YYYY') : 'N/A';
  const fechaCierre = cabecera.fechaCierre ? moment(cabecera.fechaCierre).format('DD/MM/YYYY') : 'N/A';
  const sucursal = cabecera.Sucursal.nombre || 'n/a';
  const turno = cabecera.turno || 'n/a';
  const observacion = cabecera.observacion || 'n/a';

  //conviene usar isNaN pq 0 se puede interpretar como false en el ?
  const montoApertura = !isNaN(cabecera.montoApertura) ? parseInt(cabecera.montoApertura) : 'n/a';
  const montoCierre = !isNaN(cabecera.montoCierre) ? parseInt(cabecera.montoCierre) : 'n/a';
  const montoDiferencia = !isNaN(cabecera.montoDiferencia) ? parseInt(cabecera.montoDiferencia) : 'n/a';
  const montoPendiente = !isNaN(cabecera.montoPendiente) ? parseInt(cabecera.montoPendiente) : 'n/a';
  const montoOtrosCobros = !isNaN(cabecera.montoOtrosCobros) ? parseInt(cabecera.montoOtrosCobros) : 'n/a';

  const content = [];
  content.push({ text: 'Detalle de Ventas', alignment: 'center', margin: 5, bold: true, fontSize: 16 });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Fecha Apertura: ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: fechaApertura,
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: { text: 'Fecha Cierre: ', bold: true },
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
        text: { text: 'Sucursal: ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: sucursal,
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: { text: 'Turno: ', bold: true },
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

  // TABLA
  let tableBody = [];
  //Encabezado de la tabla
  tableBody.push([{ text: 'Id Prod.', bold: true, alignment: 'center' }, { text: 'Nombre', bold: true, alignment: 'center' }, { text: 'Cantidad', bold: true, alignment: 'center' }, { text: 'Precio', bold: true, alignment: 'right' }, { text: 'Total Prod.', bold: true, alignment: 'right' }]);

  //cuerpo de la tabla
  detalleInventario.forEach((producto, index) => {
    producto = producto.dataValues;
    totalProductos += Math.round(producto.totalMultiplicado);
    tableBody.push([
      producto.idproducto,
      producto.Producto.nombre,
      producto.cantidadTotal ?? 'N/A',
      Math.round(producto.precio).toLocaleString('es-PY') ?? 'N/A',
      Math.round(producto.totalMultiplicado).toLocaleString('es-PY') ?? 'N/A',
    ]);

  });

  //ALINEAMIENTOS DE LA TABLA
  defaultAlignments = ['center', 'left', 'center', 'right', 'right']

  tableBody = tableBody.map((row, rowIndex) => {
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
    { text: 'Total Ventas +: ', bold: true },
    {},
    {},
    { text: Math.round(totalProductos).toLocaleString('es-PY'), alignment: 'right', bold: true, colSpan: 2 },

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

  //TOTALES Y RESUMENES DE RESULTADOS

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Monto Apertura = ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoApertura).toLocaleString('es-PY') ?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Monto Cierre = ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoCierre).toLocaleString('es-PY') ?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Monto Diferencia = ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoDiferencia).toLocaleString('es-PY') ?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Otros: Cobro con tarjeta + Creditos a clientes + Pagos realizados = ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoPendiente).toLocaleString('es-PY') ?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'Cobro por créditos anteriores : ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoOtrosCobros).toLocaleString('es-PY') ?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  content.push('\n')

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'INGRESO POR VENTAS DEL DIA (dif. efe. + otras formas cobro - créditos anter.) = ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoDiferencia + montoPendiente - montoOtrosCobros).toLocaleString('es-PY') ?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });

  // content.push({
  //   columns: [
  //     {
  //       width: 'auto',
  //       text: { text: 'Ventas del día = ', bold: true },
  //       margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
  //     },
  //     {
  //       width: 'auto',
  //       text: Math.round(totalVenta).toLocaleString('es-PY') ?? 'N/A',
  //       margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
  //     }
  //   ]
  // });


  // content.push('\n')

  content.push({
    columns: [
      {
        width: 'auto',
        text: { text: 'TOTAL COBRADO EN EL DIA = ', bold: true },
        margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
      },
      {
        width: 'auto',
        text: Math.round(montoDiferencia + montoPendiente - montoOtrosCobros).toLocaleString('es-PY') ?? 'N/A',
        margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
      }
    ]
  });
  content.push('\n')


  if (observacion != null && observacion.length > 0) {

    content.push('\n')
    content.push({
      text: 'OBSERVACION DE LA RENDICION/INVENTARIO: ',
      bold: true
    })

    content.push({
      text: observacion,
      italics: true,
    });
  }

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
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: 'Error al generar el pdf de ventas' });
  }
};


const inventariosConsecutivos = async (req, res) => {
  try {
    //VARIABLES

    const { idSucursal, turno1, fecha1, turno2, fecha2 } = req.query;

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');

    const fecha1Formatted = moment(fecha1).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const fecha2Formatted = moment(fecha2).endOf('day').format('YYYY-MM-DD HH:mm:ss');

    //fuente para el pdf
    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };
    const printer = new pdfMake(fonts);
    
    let nombreSucursal = '';
    let detallesInventarioActual = []
    let detallesInventarioSiguiente = []

    // CONSULTAS

    // Obtener los detalles de inventario correspondientes
    const productos = await Producto.findAll({
      where: {
        // Incluso los productos inactivos
      },
    });

    // Obtener las cabeceras de los inventarios consecutivos basados en las fechas, turnos y sucursal
    const inventariosConsecutivos = await CInventario.findAll({
      where: {
        idsucursal: idSucursal,
        fechaApertura: {
          [Op.between]: [fecha1Formatted, fecha2Formatted],
        },
        turno: {
          [Op.in]: [turno1, turno2],
        },
      },
      include: [
        {
          model: Sucursal,
          attributes: ['nombre']
        }
      ],
      order: [
        ['fechaApertura', 'ASC'],
        ['turno', 'ASC'],
      ],
    });

    // para que se imprima a pesar de encontrar un solo inventario se pone el if al consultar detalleI
    // if (inventariosConsecutivos.length < 2) {
    //    return res.status(501).json({ msg: 'No hay suficientes inventarios consecutivos para comparar.' });
    //   // throw new Error(`Datos insuficientes`);
    // }

    //SI EXISTEN EL INVENTARIO DE DE CADA FECHA ESPECIFICADA SE OBTIENE EL DETALLE
    nombreSucursal = inventariosConsecutivos[0]?.Sucursal?.nombre || inventariosConsecutivos[1]?.Sucursal?.nombre || 'N/A';

    // Obtener los detalles de inventario correspondientes'
    if (inventariosConsecutivos[0] && inventariosConsecutivos[0].idCabecera) {
      // const detallesInventarioActual = await DInventario.findAll({
      detallesInventarioActual = await DInventario.findAll({
        where: {
          idcabecera: inventariosConsecutivos[0].idCabecera, // IdCabecera para el detalleActual
        },
      });
    }

    if (inventariosConsecutivos[1] && inventariosConsecutivos[1].idCabecera) {
      detallesInventarioSiguiente = await DInventario.findAll({
        where: {
          idcabecera: inventariosConsecutivos[1].idCabecera, // IdCabecera para el detalleSiguiente
        },
      });

    }

    //PARA QUE SE MUESTREN TODOS LOS PRODUCTOS DEL INVENTARIO A PESAR DE QUE NO ESTE EN EL OTRO INVENTARIO SE RECORREN LOS PRODUCTOS REGISTRADOS
    // Filtrar productos que tienen entradas en detallesInventarioActual o detallesInventarioSiguiente
    const productosComparados = productos.filter((producto) => {
      const detalleActual = detallesInventarioActual.find((detalle) => detalle.idproducto === producto.idProducto);
      const detalleSiguiente = detallesInventarioSiguiente.find((detalle) => detalle.idproducto === producto.idProducto);
      return detalleActual || detalleSiguiente;
    }).map((producto) => ({
      idProducto: producto.idProducto,
      nombre: producto.nombre || '_',
      cantidadAnterior: detallesInventarioActual.find((detalle) => detalle.idproducto === producto.idProducto)?.cantidadCierre ?? '_',
      cantidadSiguiente: detallesInventarioSiguiente.find((detalle) => detalle.idproducto === producto.idProducto)?.cantidadApertura ?? '_',
    }));


    const content = [];
    content.push({ text: 'Comparación de Cantidades de Inventarios', alignment: 'center', margin: 5, bold: true, fontSize: 16 });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Sucursal: ', bold: true },
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
          text: { text: 'Fecha 1: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: moment(fecha1Formatted).format('DD-MM-YYYY'),
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno 1: ', bold: true },
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
          text: { text: 'Fecha 2: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: moment(fecha2Formatted).format('DD-MM-YYYY'),
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno 2: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: turno2,
        },
      ],
      margin: 3,
    });

    //TABLA
    let tableBody = [];
    //encabezado de la tabla
    tableBody.push([{ text: 'Id Prod.', bold: true, alignment: 'center' }, { text: 'Nombre', bold: true, alignment: 'center' }, { text: 'Cierre Fecha1', bold: true, alignment: 'center' }, { text: 'Apertura Fecha2', bold: true, alignment: 'center' }]);

    //cuerpo de la tabla
    productosComparados.forEach((producto, index) => {

      tableBody.push([
        producto.idProducto,
        producto.nombre,
        producto.cantidadAnterior ?? 'n/a',
        producto.cantidadSiguiente ?? 'n/a',
      ]);

    });

    //ALINEAMIENTOS DE LA TABLA
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

    const table = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 50, 50],
        body: tableBody,
      },
      layout: 'noBorders',

    }

    content.push('\n');

    content.push(table);

    //PIE DE LA PAGINA
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
    console.error('Error al generar la comparación de inventarios', error);
    res.status(500).json({ msg: 'Error al obtener el pdf ' });
  }
};

const comparacionRendiciones = async (req, res) => {

  try {
    //VARIABLES
    const { idSucursal, turno1, fecha1, turno2, fecha2 } = req.query;

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');

    const fecha1Formatted = moment(fecha1).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const fecha2Formatted = moment(fecha2).endOf('day').format('YYYY-MM-DD HH:mm:ss');
    
    //fuente del pdf
    const fonts = {
      Roboto: {
        normal: 'fonts/roboto/Roboto-Regular.ttf',
        bold: 'fonts/roboto/Roboto-Bold.ttf',
        italics: 'fonts/roboto/Roboto-Italic.ttf',
        bolditalics: 'pfonts/roboto/Roboto-BoldItalic.ttf'
      }
    };

  const printer = new pdfMake(fonts);

    let nombreSucursal = '';
    let detallesRendicionActual = []
    let detallesRendicionSiguiente = []
    let montoTotalRendicionActual;
    let montoTotalRendicionSiguiente;

    const dineros = await Dinero.findAll({
      where: {
      },
    });

    const rendicionesObtenidas = await CInventario.findAll({
      where: {
        idsucursal: idSucursal,
        fechaApertura: {
          [Op.between]: [fecha1Formatted, fecha2Formatted],

        },
        turno: {
          [Op.in]: [turno1, turno2],
        },
      },
      include: [
        {
          model: Sucursal,
          attributes: ['nombre']
        }
      ],
      order: [
        ['fechaApertura', 'ASC'],
        ['turno', 'ASC'],
      ],
    });


    //SI EXISTEN EL INVENTARIO DE DE CADA FECHA ESPECIFICADA SE OBTIENE EL DETALLE
    nombreSucursal = rendicionesObtenidas[0]?.Sucursal?.nombre || rendicionesObtenidas[1]?.Sucursal?.nombre || 'N/A';

    if (rendicionesObtenidas[0] && rendicionesObtenidas[0].idCabecera) {
      montoTotalRendicionActual = rendicionesObtenidas[0].montoCierre;
      detallesRendicionActual = await Drendicion.findAll({
        where: {
          idcabecera: rendicionesObtenidas[0].idCabecera,
        },
        include: [
          {
            model: Dinero,
            attributes: ['nombreBillete'], // Solo incluir el atributo que necesitas
          },
        ],
        order: [
          [{ model: Dinero }, 'monto', 'DESC'],
        ],
      });
    }

    if (rendicionesObtenidas[1] && rendicionesObtenidas[1].idCabecera) {
      montoTotalRendicionSiguiente = rendicionesObtenidas[1].montoApertura;
      detallesRendicionSiguiente = await Drendicion.findAll({
        where: {
          idcabecera: rendicionesObtenidas[0].idCabecera,
        },
        include: [
          {
            model: Dinero,
            attributes: ['nombreBillete', 'monto'], // Solo incluir el atributo que necesitas
          },
        ],
        order: [
          [{ model: Dinero }, 'monto', 'DESC'],
        ],
      });
    }

    //PARA QUE SE MUESTREN TODOS LOS BILLETES DEL DETALLE A PESAR DE QUE NO ESTE EN LA OTRA RENDICION SE RECORREN LOS BILLETES REGISTRADOS
    // Filtrar productos que tienen entradas en detallesInventarioActual o detallesInventarioSiguiente
    const dinerosComparados = dineros.filter((billete) => {
      const detalleActual = detallesRendicionActual.find((detalle) => detalle.iddinero === billete.idBillete);
      const detalleSiguiente = detallesRendicionSiguiente.find((detalle) => detalle.iddinero === billete.idBillete);

      return detalleActual || detalleSiguiente;
    }).map((dinero) => ({
      idBillete: dinero.idBillete,
      nombre: dinero.nombreBillete || '_',
      monto: dinero.monto || 'n/a',
      cantidadAnterior: detallesRendicionActual.find((detalle) => detalle.iddinero === dinero.idBillete)?.cantidadCierre ?? '_',
      totalAnterior: detallesRendicionActual.find((detalle) => detalle.iddinero === dinero.idBillete)?.totalCierre ?? '_',
      cantidadSiguiente: detallesRendicionSiguiente.find((detalle) => detalle.iddinero === dinero.idBillete)?.cantidadApertura ?? '_',
      totalSiguiente: detallesRendicionSiguiente.find((detalle) => detalle.iddinero === dinero.idBillete)?.totalApertura ?? '_',
    }));

    const content = [];
    content.push({ text: 'Comparación de Cantidades de Rendicion', alignment: 'center', margin: 5, bold: true, fontSize: 16 });

    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Sucursal: ', bold: true },
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
          text: { text: 'Fecha 1: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: moment(fecha1Formatted).format('DD-MM-YYYY'),
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno 1: ', bold: true },
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
          text: { text: 'Fecha 2: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: moment(fecha2Formatted).format('DD-MM-YYYY'),
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Turno 2: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: turno2,
        },
      ],
      margin: 3,
    });

    
    let tableBody = [];
    tableBody.push([{ text: 'Id Bill.', bold: true, alignment: 'center' }, { text: 'Nombre', bold: true, alignment: 'center' }, { text: 'Monto', bold: true, alignment: 'center' }, { text: 'Cantidad Fecha1', bold: true, alignment: 'center' }, { text: 'Total Fecha1', bold: true, alignment: 'right' }, { text: 'Apertura Fecha2', bold: true, alignment: 'center' }, { text: 'Totl Fecha1', bold: true, alignment: 'right' }]);

    dinerosComparados.forEach((billete, index) => {

      // if(isNaN(producto.cantidadAnterior) || isNaN(producto.cantidadSiguiente)){
      tableBody.push([
        billete.idBillete,
        billete.nombre,
        Math.round(billete.monto),
        !isNaN(billete.cantidadAnterior) ? Math.round(billete.cantidadAnterior).toLocaleString('es-PY'): 'n/a',
        !isNaN(billete.totalAnterior) ? Math.round(billete.totalAnterior).toLocaleString('es-PY'): 'n/a',

        !isNaN(billete.cantidadSiguiente) ?Math.round(billete.cantidadSiguiente).toLocaleString('es-PY'): 'n/a',
        !isNaN(billete.totalSiguiente) ? Math.round(billete.totalSiguiente).toLocaleString('es-PY'):'n/a',
      ]);

      // }
    });

    const defaultAlignments = ['center', 'left', 'center', 'center', 'right', 'center', 'right'];
    tableBody = tableBody.map((row, rowIndex) => {
      if (rowIndex === 0) {
        // Aplicar alineación predeterminada solo a la cabecera
        return row;
      } else {
        // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
        return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
      }
    });

    
    const table = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 50, 50, 50, 50, 50],
        body: tableBody,
      },
      layout: 'noBorders',

    }

    content.push('\n');

    content.push(table);

    content.push('\n');
    content.push({
      columns: [
        {
          width: 'auto',
          text: { text: 'Monto cierre fecha 1: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: montoTotalRendicionActual,
          margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: { text: 'Monto apertura fecha 2: ', bold: true },
          margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
        },
        {
          width: 'auto',
          text: montoTotalRendicionSiguiente,
        },
      ],
      margin: 3,
    });

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
    res.status(500).json({ msg: 'Error al obtener el pdf ' });
  }
};

module.exports = {
  obtenerDetalleInventario,
  obtenerVentas,
  obtenerRendicion,
  obtenerSalidas,
  obtenerRecepciones,
  inventariosConsecutivos,
  comparacionRendiciones
}

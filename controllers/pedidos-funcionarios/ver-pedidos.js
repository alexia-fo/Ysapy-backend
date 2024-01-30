const pdfMake = require('pdfmake');
// const fs = require('fs');
//Para transacciones
const sequelize = require('../../db/conections');
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';

const { Op } = require("sequelize");
const DPedidoFuncionario = require('../../model/dPedidoFuncionario');
const CPedidoFuncionario = require('../../model/cPedidoFuncionario');
const Marca = require('../../model/marca');
const { Producto, Sucursal } = require('../../model');
const Parametro = require('../../model/parametro');
const Unidad = require('../../model/unidad');

//! PEDIDOS ENVIADOS

//FIXME: OBTENDRA LAS CABECERAS DE PEDIDOS DE DIFERENTES FECHAS
//*PARAMETROS: 
    //"limite" seria la fecha final, "desde" seria la fecha inicial, "tipoFecha"=fechaAlta || fechaEntrega
//*OBTENER LAS CABECERAS SEGUN EL USUARIO
//todo:utilizado
const  verCabecerasPedidosEnviados = async (req, res) => {
//PARA OBTENER POR DEFECTO LOS PEDIDOS DE LOS ULTIMOS 7 DIAS

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('YYYY-MM-DD');
    // Restar 7 días a la fecha actual
    const fechaHaceDias = fechaActual.subtract(7, 'days');
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHaceDiasFormateada = fechaHaceDias.format('YYYY-MM-DD');

    const {limite = fechaHoy, desde =fechaHaceDiasFormateada, tipoFecha="fechaAlta", codMarca="todos", turno="todos"} = req.query;
    
    let total, cabeceras;

    const idUsuario=req.usuario.idUsuario;

    const condiciones={};

    try {

        // Verificar si codMarca no es null ni undefined
        if (codMarca != "todos" ) {
            condiciones.idmarca = codMarca;
        }

        // Verificar si turno no es null ni undefined
        if (turno != "todos") {
            condiciones.turno = turno;
        }

        if(tipoFecha=="fechaAlta"){
            [total, cabeceras] = await Promise.all([
                CPedidoFuncionario.count({ where: { //! el operador between excluye los extremos
                    // fechaAlta: { [Op.between]: [desde, limite] }
                    [Op.and]: [
                        sequelize.where(sequelize.fn('DATE', sequelize.col('fechaAlta')), '>=', desde),
                        sequelize.where(sequelize.fn('DATE', sequelize.col('fechaAlta')), '<=', limite),
                    ],
                    idusuario:idUsuario
                } }),
                CPedidoFuncionario.findAll({
                    where: { 
                        [Op.and]: [
                            sequelize.where(sequelize.fn('DATE', sequelize.col('fechaAlta')), '>=', desde),
                            sequelize.where(sequelize.fn('DATE', sequelize.col('fechaAlta')), '<=', limite),
                        ],
                        idusuario:idUsuario,
                        ...condiciones
                    },
                    // include: [{ model: Usuario, attributes: ['nombre'] }, { model: Sucursal, attributes: ['nombre'] }],
                    order: [['fechaAlta', 'DESC']], // Ordena por fechaApertura en forma descendente
                    include:[
                        {
                            model:Sucursal,
                            attributes:["nombre"]
                        },
                        {
                            model:Marca,
                            attributes:["nombreMarca"]
                        },
                        {
                            model:Parametro,
                            attributes:["nombre"]
                        }
                    ],
                    attributes:['idCabecera', 'observacion', 'fechaEntrega', 'fechaAlta']
                })
            ]); 

        }else{//por fechaEntrega
            [total, cabeceras] = await Promise.all([
                CPedidoFuncionario.count({ where: { 
                    // fechaEntrega: { [Op.between]: [desde, limite] }
                    [Op.and]: [
                        sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '>=', desde),
                        sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '<=', limite),
                    ],
                    idusuario:idUsuario
                } }),
                CPedidoFuncionario.findAll({
                    where: { 
                        [Op.and]: [
                            sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '>=', desde),
                            sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '<=', limite),
                        ],
                        idusuario:idUsuario,
                        ...condiciones
                    },
                    // include: [{ model: Usuario, attributes: ['nombre'] }, { model: Sucursal, attributes: ['nombre'] }],
                    order: [['fechaEntrega', 'DESC']], // Ordena por fechaApertura en forma descendente
                    include:[
                        {
                            model:Sucursal,
                            attributes:["nombre"]
                        },
                        {
                            model:Marca,
                            attributes:["nombreMarca"]
                        },
                        {
                            model:Parametro,
                            attributes:["nombre"]
                        }
                    ],
                    attributes:['idCabecera', 'observacion', 'fechaEntrega', 'fechaAlta']

                })
            ]); 

        }

        res.json({
            total,
            cabeceras
        });   

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los pedidos eviados"});
    }
};
  
//todo: utilizado
//FIXME: UNA VEZ SELECCIONADA LA CABECERA DE PEDIDO ESTE CONTROLADOR DEVOLVERA EL DETALLE DE LOS PRODUCTOS QUE SE PIDIO CON ESA CABECERA
//*PARAMETROS: 
    //"idCabecera" que seria la cabecera del pedido
const  verDetalleCabPedidosEnviadosPDF = async (req, res) => {
    const {idCabecera}=req.params;

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');

    const idUsuario=req.usuario.idUsuario;

    try{
        const [cabecera, detallePedido] =await Promise.all([
            CPedidoFuncionario.findOne({ 
                where: {
                    idCabecera,
                    idusuario:idUsuario
                } ,
                attributes:['fechaEntrega', 'fechaAlta', 'observacion', 'estado', 'idCabecera'],
                include: [
                    {
                        model:Marca,
                        attributes:["nombreMarca"]
                    },
                    {
                        model:Parametro,
                        attributes:["nombre"]
                    },
                    {
                        model: Sucursal,
                        attributes: ['nombre'],
                    },
                ],
            }),
            DPedidoFuncionario.findAll({
                where: { 
                    idcpedido: idCabecera,
                },
                attributes: [
                    'idproducto',
                    'cantidad',
                ],
                include: [
                    {
                        model: Producto,
                        attributes: ['nombre'],
                        include:[
                            {
                                model:Unidad,
                                attributes:['NombreUnidad']
                            }
                        ]
                    },

                ],
                order: [
                    [{ model: Producto }, 'nombre', 'ASC'] // Ordena por nombre del Producto en forma ascendente
                ]
            })
        ]);
        
        const fechaAlta = cabecera.fechaAlta ? moment(cabecera.fechaAlta).format('DD/MM/YYYY') : 'N/A';
        const fechaEntrega = cabecera.fechaEntrega ? moment(cabecera.fechaEntrega).format('DD/MM/YYYY') : 'N/A';
        const observacion = cabecera.observacion|| 'n/a';
        const sucursal = cabecera.Sucursal.nombre|| 'n/a';
        const turno = cabecera.Parametro.nombre|| 'n/a';
        const marca = cabecera.Marca.nombreMarca|| 'n/a';
        const estado = cabecera.estado ? "Activo" : 'Inactivo';

        //CONSTRUCCION DEL PDF

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

        const content = [];
        content.push({ text: 'Detalle del Pedido '+idCabecera, alignment: 'center', margin: 5, bold: true, fontSize: 16 });

        content.push({
            columns: [
            {
                width: 'auto',
                text: { text: 'Fecha Alta: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: fechaAlta,
                margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
            },

            {
                width: 'auto',
                text: { text: 'Fecha Entrega: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: fechaEntrega,
                margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
            },

            {
                width: 'auto',
                text: { text: 'Sucursal: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: sucursal,
            },
            ],
            margin: 3,
        });

        content.push({
            columns: [
            {
                width: 'auto',
                text: { text: 'Estado: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: estado,
                margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
            },

            {
                width: 'auto',
                text: { text: 'Marca: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: marca,
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
                margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas

            },

            ],
            margin: 3,
        });
        content.push({
            columns: [
            {
                width: 'auto',
                text: { text: 'Obsrvación: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: observacion,
            },
            ],
            margin: 3,
        });

        
        content.push('\n');

        //TABLA

        let tableBody = [];
        //encabezado de la tabla
        tableBody.push([
        { text: 'Id Prod.', bold: true, alignment: 'center' }, 
        { text: 'Producto', bold: true, alignment: 'center' }, 
        { text: 'Cantidad', bold: true, alignment: 'center' },
        { text: 'Medida', bold: true, alignment: 'center' }
    ]);

        //cuerpo de la tabla
        detallePedido.forEach((producto, index) => {
        producto = producto.dataValues;
        tableBody.push([
            producto.idproducto,
            producto.Producto.nombre,
            Math.round(producto.cantidad).toLocaleString('es-PY') ?? 'N/A',
            {text:producto.Producto.Unidad.NombreUnidad, alignment:"left", margin:[5, 0]},
        ]);

        });

        //ALINEAMIENTOS DE LA TABLA
        defaultAlignments = ['center', 'left', 'right']

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
            widths: [50, 250, 100, 70],
            body: tableBody,
        },
        // layout: 'headerLineOnly'
        layout: 'noBorders',
        // fontSize:12
        };

        content.push(table);

        content.push('\n')

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
        res.status(500).json({ msg: 'Error al generar el pdf de detalle de cabecera enviada' });
    }

    // res.json({
    //     detallePedido,
    //     cabecera
    // });
}

//FIXME: OBTENDRA EL TOTAL DE CADA PRODUCTO PEDIDO EN UNA FECHA DE ALTA O CON FECHA DE ENTREGA
//*PARAMETROS: 
    //"fecha" y "tipoFecha"=fechaAlta || fechaEntrega
//*OBTENER LOS TOTALES POR USUARIO
//Parametros: fecha, tipoFecha
//obtiene el usuario del token
//todo: utilizado
const  verTotalPedidosEnviadosPDF = async (req, res) => {

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('YYYY-MM-DD');

    const {fecha = fechaHoy, tipoFecha="fechaAlta"} = req.query; //tipoFecha puede tener los valores fechaAlta y fechaEntrega
    
    idUsuario=req.usuario.idUsuario;

    try{


        const [detallePedido] =await Promise.all([

            DPedidoFuncionario.findAll({
                attributes: [
                    'idproducto',
                    [sequelize.fn('SUM', sequelize.col('cantidad')), 'totalCantidad'],
                ],
                include: [
                    {
                        model:CPedidoFuncionario,
                        where: {
                            [Op.and]: sequelize.where(
                                sequelize.fn('DATE', sequelize.col(tipoFecha)),
                                fecha
                            ),
                            idusuario:idUsuario
                        } 
                    },
                    {
                        model: Producto,
                        attributes: ['nombre'],
                        include:[
                            {
                                model:Unidad,
                                attributes:['NombreUnidad']
                            }
                        ]
                    },
                ],
                group: ['idProducto'],
                order: [
                    [{ model: Producto }, 'nombre', 'ASC'] // Ordena por nombre del Producto en forma ascendente
                ]
            })
        ]);

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

        let titulo=tipoFecha=="fechaAlta"?"Total de Productos Registrados":"Total de Productos Agendados";
        let subtitulo = tipoFecha=="fechaAlta"?"Con Fecha de Registro: ":"Con Fecha Entrega: ";
        let color=tipoFecha=="fechaAlta"?"green":"red";

        const content = [];
        content.push({ text: titulo, alignment: 'center', margin: 5, bold: true, fontSize: 16, color });

        content.push({
            columns: [
            {
                width: 'auto',
                text: { text: subtitulo, bold: true, color},
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: moment(fecha).format('DD-MM-YYYY'),
                margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
            },
           
            ],
            margin: 3,
        });

        
        content.push('\n');

        //TABLA

        let tableBody = [];
        //encabezado de la tabla
        tableBody.push([
        { text: 'Id Prod.', bold: true, alignment: 'center' }, 
        { text: 'Producto', bold: true, alignment: 'center' }, 
        { text: 'Cantidad', bold: true, alignment: 'center' },
        { text: 'Medida', bold: true, alignment: 'center' }
    ]);

        //cuerpo de la tabla
        detallePedido.forEach((producto, index) => {
        producto = producto.dataValues;
        tableBody.push([
            producto.idproducto,
            producto.Producto.nombre,
            {text:Math.round(producto.totalCantidad).toLocaleString('es-PY') ?? 'N/A', alignment:"right"},        
            {text:producto.Producto.Unidad.NombreUnidad, alignment:"left", margin:[5, 0]},
        ]);

        });

        // //ALINEAMIENTOS DE LA TABLA
        // defaultAlignments = ['center', 'left', 'right']

        // tableBody = tableBody.map((row, rowIndex) => {
        // if (rowIndex === 0) {
        //     // Aplicar alineación predeterminada solo a la cabecera
        //     return row;
        // } else {
        //     // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
        //     return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
        // }
        // })

        const table = {
        table: {
            headerRows: 1,
            widths: [50, 250, 100, 70],
            body: tableBody,
        },
        // layout: 'headerLineOnly'
        layout: 'noBorders',
        // fontSize:12
        };

        content.push(table);

        content.push('\n')

        const docDefinition = {
            content,
            footer: function (currentPage, pageCount) {
            return {
                columns: [
                {
                    text: fechaActual.format('DD-MM-YYYY HH:mm:ss'), // Agrega la fecha actual a la izquierda
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
        res.status(500).json({ msg: 'Error al generar el pdf de totales pedidos eviados' });
    }

    // res.json({
    //     detallePedido,
    //     cabecera
    // });
}

//! PEDIDOS RECIBIDOS 

//FIXME: OBTENDRA LOS PEDIDOS RECIBIDOS CON FECHA DE ENTREGA LA FECHA ESPECIFICA
//PARAMETROS: fecha --> seria la fecha de entrega
//*OBTENDRA LOS PRODUCTOS DE ACUERDO A LAS CATEGORIAS
    //si es de categoria F: fabrica solo obtendra los productos con codmarca=100 cuya marca es: DISCOS Y PANES
    //si es de categoria C: cocina solo obtendra los productos con codmarca=102 cuya marca es: ROTI de rostiseria 
//todo:utilizado
const  verTotalPedidosRecibidosPDF = async (req, res) => {

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('YYYY-MM-DD');

    const {fecha = fechaHoy, codMarca, turno} = req.query;

    let condiciones={};

    try{
        
            // Verificar si codMarca no es null ni undefined
            if (codMarca != "null" ) {
                console.log("------> ejecuto codMarca!= null", codMarca);
                condiciones.idmarca = codMarca;
            }

            // Verificar si turno no es null ni undefined
            if (turno != "null") {
                console.log("------> ejecuto turno!= null", turno);
                condiciones.turno = turno;
            }
        
            const [detallePedido] =await Promise.all([

                DPedidoFuncionario.findAll({
                    attributes: [
                        'idproducto',
                        [sequelize.fn('SUM', sequelize.col('cantidad')), 'totalCantidad'],
                    ],
                    include: [
                        {
                            model:CPedidoFuncionario,
                            where: {
                                [Op.and]: sequelize.where(
                                    sequelize.fn('DATE', sequelize.col("fechaEntrega")),
                                    fecha
                                ),
                                ...condiciones
                            } 
                        },
                        {
                            model: Producto,
                            attributes: ['nombre'],
                            include:[
                                {
                                    model:Unidad,
                                    attributes:['NombreUnidad']
                                }
                            ]
                        },
                    ],
                    group: ['idProducto'],
                    order: [
                        [{ model: Producto }, 'nombre', 'ASC'] // Ordena por nombre del Producto en forma ascendente
                    ]
                })
            ]);


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

        const content = [];
        content.push({ text: "Total de Pedidos", alignment: 'center', margin: 5, bold: true, fontSize: 16 });

        content.push({
            columns: [
            {
                width: 'auto',
                text: { text: "Para la fecha: ", bold: true},
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: moment(fecha).format('DD-MM-YYYY'),
                margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
            },
           
            ],
            margin: 3,
        });

        
        content.push('\n');

        //TABLA

        let tableBody = [];
        //encabezado de la tabla
        tableBody.push([
        { text: 'Id Prod.', bold: true, alignment: 'center' }, 
        { text: 'Producto', bold: true, alignment: 'center' }, 
        { text: 'Cantidad', bold: true, alignment: 'center' },
        { text: 'Medida', bold: true, alignment: 'center' }
    ]);

        //cuerpo de la tabla
        detallePedido.forEach((producto, index) => {
        producto = producto.dataValues;
        tableBody.push([
            producto.idproducto,
            producto.Producto.nombre,
            {text:Math.round(producto.totalCantidad).toLocaleString('es-PY') ?? 'N/A', alignment:"right"},
            {text:producto.Producto.Unidad.NombreUnidad, alignment:"left", margin:[5, 0]},
        ]);

        });

        // //ALINEAMIENTOS DE LA TABLA
        // defaultAlignments = ['center', 'left', 'right', 'left']

        // tableBody = tableBody.map((row, rowIndex) => {
        // if (rowIndex === 0) {
        //     // Aplicar alineación predeterminada solo a la cabecera
        //     return row;
        // } else {
        //     // Aplicar alineaciones predeterminadas al contenido (excluyendo la cabecera)
        //     return row.map((cell, index) => ({ text: cell, alignment: defaultAlignments[index] }));
        // }
        // })

        const table = {
        table: {
            headerRows: 1,
            widths: [50, 250, 100, 70],
            body: tableBody,
        },
        // layout: 'headerLineOnly'
        layout: 'noBorders',
        // fontSize:12
        };

        content.push(table);

        content.push('\n')

        const docDefinition = {
            content,
            footer: function (currentPage, pageCount) {
            return {
                columns: [
                {
                    text: fechaActual.format('DD-MM-YYYY HH:mm:ss'), // Agrega la fecha actual a la izquierda
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
        res.status(500).json({ msg: 'Error al generar el pdf de total de pedidos recibidos' });
    }

    // res.json({
    //     detallePedido,
    //     cabecera
    // });
}

//PARAMETROS: "limite", "desde" serian las fechas de inicio y de fin
//*OBTENDRA LOS PRODUCTOS DE ACUERDO A LAS CATEGORIAS
    //si es de categoria F: fabrica solo obtendra los productos con codmarca=100 cuya marca es: DISCOS Y PANES
    //si es de categoria C: cocina solo obtendra los productos con codmarca=102 cuya marca es: ROTI de rostiseria 

const  verCabecerasPedidosRecibidos = async (req, res) => {
    //PARA OBTENER POR DEFECTO LOS PEDIDOS DE LOS ULTIMOS 7 DIAS
    
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
        // Restar 7 días a la fecha actual
        const fechaHaceDias = fechaActual.subtract(7, 'days');
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHaceDiasFormateada = fechaHaceDias.format('YYYY-MM-DD');
    
        const {limite = fechaHoy, desde =fechaHaceDiasFormateada} = req.query;
        
        let total, cabeceras;
    
        const categoriaUsuario=req.usuario.categoria;

        try {
            let total, cabeceras;

            if(categoriaUsuario=="F"){
                [total, cabeceras] =await Promise.all([

                    CPedidoFuncionario.count({ 
                        // where: { fechaEntrega: { [Op.between]: [desde, limite] }} 
    
                        where: { 
                            [Op.and]: [
                                sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '>=', desde),
                                sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '<=', limite),
                            ],
                            idmarca:100

                        },
                    }),
                    CPedidoFuncionario.findAll({
                        where: { 
                            [Op.and]: [
                                sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '>=', desde),
                                sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '<=', limite),
                            ],
                            idmarca:100
                        },                            
                        // include: [{ model: Usuario, attributes: ['nombre'] }, { model: Sucursal, attributes: ['nombre'] }],
                        order: [['fechaEntrega', 'DESC']], // Ordena por fechaApertura en forma descendente
                        include:[
                            {
                                model:Sucursal,
                                attributes:["nombre"]
                            }
                        ]
                    })
                ])
            }else if(categoriaUsuario=="C"){
                [total, cabeceras] =await Promise.all([

                    CPedidoFuncionario.count({ 
                        // where: { fechaEntrega: { [Op.between]: [desde, limite] }} 
    
                        where: { 
                            [Op.and]: [
                                sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '>=', desde),
                                sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '<=', limite),
                            ],
                            idmarca:102

                        },
                    }),
                    CPedidoFuncionario.findAll({
                        where: { 
                            [Op.and]: [
                                sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '>=', desde),
                                sequelize.where(sequelize.fn('DATE', sequelize.col('fechaEntrega')), '<=', limite),
                            ],
                            idmarca:102
                        },
                        // include: [{ model: Usuario, attributes: ['nombre'] }, { model: Sucursal, attributes: ['nombre'] }],
                        order: [['fechaEntrega', 'DESC']], // Ordena por fechaApertura en forma descendente
                        include:[
                            {
                                model:Sucursal,
                                attributes:["nombre"]
                            }
                        ]
                    })
                ])
            }
                
            res.json({
                total,
                cabeceras,
            });   
    
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error: "Error al obtener los pedidos"});
        }
};

//FIXME: UNA VEZ SELECCIONADA LA CABECERA DE PEDIDO ESTE CONTROLADOR DEVOLVERA EL DETALLE DE LOS PRODUCTOS QUE SE PIDIO CON ESA CABECERA
//PARAMETROS: "idCabecera" que seria la cabecera del pedido
//*OBTENDRA LOS PRODUCTOS DE ACUERDO A LAS CATEGORIAS(igual verifica para validar)
    //si es de categoria F: fabrica solo obtendra los productos con codmarca=100 cuya marca es: DISCOS Y PANES
    //si es de categoria C: cocina solo obtendra los productos con codmarca=102 cuya marca es: ROTI de rostiseria 

const  verDetalleCabPedidosRecibidosPDF = async (req, res) => {
    const {idCabecera}=req.params;

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    const fechaHoy = fechaActual.format('DD-MM-YYYY HH:mm:ss');

    const categoriaUsuario=req.usuario.categoria;
    
    try{
        let cabecera, detallePedido;
        if(categoriaUsuario=="F"){
            [cabecera, detallePedido] =await Promise.all([
                CPedidoFuncionario.findOne({ 
                    where: {
                        idCabecera,
                        idmarca:100
                    } ,
                    attributes:['fechaEntrega','estado', 'idCabecera'],
                    include: [
                        {
                        model: Marca,
                        attributes: ['nombreMarca'],
                        },
                        {
                            model: Sucursal,
                            attributes: ['nombre'],
                        },
                    ],
                }),
                DPedidoFuncionario.findAll({
                    where: { idcpedido: idCabecera },
                    attributes: [
                        'idproducto',
                        'cantidad',
                    ],
                    include: [
                        {
                            model: Producto,
                            attributes: ['nombre'],
                        },
                        {
                            model:CPedidoFuncionario,
                            where:{
                                idmarca:100
                            }
                        }
                    ],
                    order: [
                        [{ model: Producto }, 'nombre', 'ASC'] // Ordena por nombre del Producto en forma ascendente
                    ]
                })
            ]);
        }else if(categoriaUsuario=="C"){
            [cabecera, detallePedido] =await Promise.all([
                CPedidoFuncionario.findOne({ 
                    where: {
                        idCabecera,
                        idmarca:102
                    } ,
                    attributes:['fechaEntrega','estado', 'idCabecera'],
                    include: [
                        {
                        model: Marca,
                        attributes: ['nombreMarca'],
                        },
                        {
                            model: Sucursal,
                            attributes: ['nombre'],
                        },
                    ],
                }),
                DPedidoFuncionario.findAll({
                    where: { idcpedido: idCabecera },
                    attributes: [
                        'idproducto',
                        'cantidad',
                    ],
                    include: [
                        {
                            model: Producto,
                            attributes: ['nombre'],
                        },
                        {
                            model:CPedidoFuncionario,
                            where:{
                                idmarca:102
                            }
                        }
                    ],
                    order: [
                        [{ model: Producto }, 'nombre', 'ASC'] // Ordena por nombre del Producto en forma ascendente
                    ]
                })
            ]);
        }


        const fechaEntrega = cabecera.fechaEntrega ? moment(cabecera.fechaEntrega).format('DD/MM/YYYY') : 'N/A';
        const sucursal = cabecera.Sucursal.nombre|| 'n/a';
        const estado = cabecera.estado ? "Activo" : 'Inactivo';

        //CONSTRUCCION DEL PDF

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

        const content = [];
        content.push({ text: `Detalle del Pedido ${idCabecera} a entregar`, alignment: 'center', margin: 5, bold: true, fontSize: 16 });

        content.push({
            columns: [
            {
                width: 'auto',
                text: { text: 'Fecha Entrega: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: fechaEntrega,
            },
            ],
            margin: 3,
        });

        content.push({
            columns: [
            {
                width: 'auto',
                text: { text: 'Estado: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: estado,
                margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: { text: 'Sucursal: ', bold: true },
                margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
            },
            {
                width: 'auto',
                text: sucursal,
            },
            ],
            margin: 3,
        });


        
        content.push('\n');

        //TABLA

        let tableBody = [];
        //encabezado de la tabla
        tableBody.push([{ text: 'Id Prod.', bold: true, alignment: 'center' }, { text: 'Producto', bold: true, alignment: 'center' }, { text: 'Cantidad', bold: true, alignment: 'center' }]);

        //cuerpo de la tabla
        detallePedido.forEach((producto, index) => {
        producto = producto.dataValues;
        tableBody.push([
            producto.idproducto,
            producto.Producto.nombre,
            Math.round(producto.cantidad).toLocaleString('es-PY') ?? 'N/A',
        ]);

        });

        //ALINEAMIENTOS DE LA TABLA
        defaultAlignments = ['center', 'left', 'center']

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
            widths: ['*', 200, 100, 50],
            body: tableBody,
        },
        // layout: 'headerLineOnly'
        layout: 'noBorders',
        // fontSize:12
        };

        content.push(table);

        content.push('\n')

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
        res.status(500).json({ msg: 'Error al generar el pdf de detalle de Caebecera de Pedidos' });
    }

    // res.json({
    //     detallePedido,
    //     cabecera
    // });
}

//FIXME: ESTO ES UN INFORME ESTRUCTURADO
//*PARAMETROS fechaEntrega, turo(falta)
//agrupado por fecha, sucursal, turno
//filtrado por fecha (fechaEntrega), turno, codMarca
//todo:utilizado
const  verPedidosPorSucursalYmarcaPDF = async (req, res) => {
  // Obtener la fecha actual según la zona horaria de Paraguay
  const fechaActual = moment().tz(zonaHorariaParaguay);
  // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
  const fechaHoy = fechaActual.format('YYYY-MM-DD');

  const {fecha = fechaHoy, codMarca, turno} = req.query;    
  
  //ahora obtenemos la categoria del usuario para listar los productos que le correspondan
  //si es de categoria F: fabrica solo obtendra los productos con codmarca=100 cuya marca es: DISCOS Y PANES
  //si es de categoria C: cocina solo obtendra los productos con codmarca=102 cuya marca es: ROTI de rostiseria 

  let condiciones={};

  try{

    // Verificar si codMarca no es null ni undefined
    if (codMarca != "null" ) {
        condiciones.idmarca = codMarca;
    }

    // Verificar si turno no es null ni undefined
    if (turno != "null") {
        condiciones.turno = turno;
    }

          const [sucursales, marcas, detallePedido] = await Promise.all([
            Sucursal.findAll({}),

            Marca.findAll({}),

            DPedidoFuncionario.findAll({
            attributes: [
                'idproducto',
                [sequelize.fn('SUM', sequelize.col('cantidad')), 'totalCantidad'],
                [sequelize.literal('CpedidoFuncionario.idsucursal'), 'idsucursal'], // Obtén el idsucursal a través de la subconsulta
            ],
            include: [
                {
                model: CPedidoFuncionario,
                where: {
                    [Op.and]: sequelize.where(
                    sequelize.fn('DATE', sequelize.col("fechaEntrega")),
                    fecha
                    ),
                    ...condiciones
                },
                include: [
                    {
                    model: Marca,
                    attributes: ['nombreMarca'],
                    },
                    {
                    model: Sucursal,
                    attributes: ['idSucursal', 'nombre'],
                    },
                ],
                //   attributes: [],
                },
                {
                model: Producto,
                    // attributes: ['idproducto', 'nombre'],
                    include:[
                        {
                            model: Unidad,
                            attributes: ['NombreUnidad'],
                        },
                    ]
                },
            ],
            // group: ['idproducto', sequelize.literal('CpedidoFuncionario.idsucursal')], // Agrupa primero por idproducto y luego por idsucursal
            group: ['idproducto', sequelize.literal('CpedidoFuncionario.idsucursal')],/*.concat(turno!="null" ? [] : ['turno']), // si el turno ya se establecio no hace falta agruparlo ya que ya esta en la condicion y solo se obtendra de ese turno*/

            order: [
                ['idproducto', 'ASC'], // Ordena por idproducto en forma ascendente
                [sequelize.literal('CpedidoFuncionario.idsucursal'), 'ASC'], // Ordena por idsucursal en forma ascendente
            ]
            })
          ]);

    //   console.log(detallePedido.map(producto => producto.toJSON()));

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

      const content = [];
      content.push({ text: "Productos a Enviar por Sucursal y Categoria", alignment: 'center', margin: 5, bold: true, fontSize: 16 });

      content.push({
          columns: [
          {
              width: 'auto',
              text: { text: "Para la fecha: ", bold: true},
              margin: [0, 0, 1, 0], // Ajusta el margen derecho para separar las columnas
          },
          {
              width: 'auto',
              text: fecha,
              margin: [0, 0, 20, 0], // Ajusta el margen derecho para separar las columnas
          },
         
          ],
          margin: 3,
      });

      
      content.push('\n');

      //TABLA

      let tabla=[];

      let tableBody = [];
      //encabezado de la tabla
      tableBody.push([
        { text: 'Sucursal', bold: true, alignment: 'center' }, 
        { text: 'Marca', bold: true, alignment: 'center' }, 
        { text: 'Producto', bold: true, alignment: 'center' }, 
        { text: 'Cantidad', bold: true, alignment: 'center' },
        { text: 'Unidad', bold: true, alignment: 'center' }]);


        
    //   sucursales.forEach((s, index) => {
    //     tableBody.push([
    //         {
    //             colSpan: 5,
    //             // colSpan: 4,
    //             text: `${s.dataValues.nombre}` || 'na',
    //             fillColor: '#eeeeee',
    //             border: [false, false, false, false]
    //         }
    //     ])
    //     marcas.forEach((m, index) => {

    //         tableBody.push([
    //             {text:""},
    //             {
    //                 colSpan: 4,
    //                 // colSpan: 3,
    //                 text: `${m.dataValues.nombreMarca}` || 'na',
    //                 fillColor: '#d19f9f',
    //                 border: [false, false, false, false]
    //             }
    //         ])

    //         // console.log(`--- Marca ${m.codMarca} y Sucursal ${s.idSucursal}`)
    //         detallePedido.forEach((p, index) => {
    //             let producto=p.dataValues;
    //             let sucursal=producto.CpedidoFuncionario.dataValues.idsucursal;
    //             let marca=producto.CpedidoFuncionario.dataValues.idmarca;
    //             let turno=producto.CpedidoFuncionario.dataValues.turno;
    //             // console.log("- - - - -  - - - - - - ")
    //             // console.log(producto.CpedidoFuncionario.dataValues)
            
    //             if(sucursal==s.idSucursal && marca==m.codMarca){
    //                 tableBody.push([
    //                     {text:""},
    //                     {text:""},
    //                     {text: p.dataValues.Producto.nombre || "na v", alignment: "left"},
    //                     {text: p.dataValues.totalCantidad || "na v", alignment: "center"},
    //                     {text: turno || "na v", alignment: "center"},
    //                 ])
    //             }
    //         });
    //     });
    // });


    sucursales.forEach((s, index) => {
        const marcaFiltrada = marcas.filter(m => detallePedido.some(p => p.dataValues.CpedidoFuncionario.dataValues.idsucursal === s.idSucursal && p.dataValues.CpedidoFuncionario.dataValues.idmarca === m.codMarca));
        
        if (marcaFiltrada.length > 0) {
            tableBody.push([
                {
                    colSpan: 5,
                    text: `${s.dataValues.nombre}` || 'na',
                    fillColor: '#eeeeee',
                    border: [false, false, false, false]
                }
            ]);
    
            marcaFiltrada.forEach((m, index) => {
                tableBody.push([
                    { text: "" },
                    {
                        colSpan: 4,
                        text: `${m.dataValues.nombreMarca}` || 'na',
                        fillColor: '#d19f9f',
                        border: [false, false, false, false]
                    }
                ]);
    
                detallePedido.forEach((p, index) => {
                    let producto = p.dataValues;
                    let sucursal = producto.CpedidoFuncionario.dataValues.idsucursal;
                    let marca = producto.CpedidoFuncionario.dataValues.idmarca;
    
                    if (sucursal === s.idSucursal && marca === m.codMarca) {
                        tableBody.push([
                            { text: "" },
                            { text: "" },
                            { text: p.dataValues.Producto.nombre || "na v", alignment: "left" },
                            { text: Math.round(p.dataValues.totalCantidad ).toLocaleString('es-PY') ?? 'N/A', alignment: "right" },
                            { text: producto.Producto.Unidad.NombreUnidad || "na v", alignment: "left" , margin:[10, 0]},
                        ]);
                    }
                });
            });
        }
    });
    


      const table = {
      table: {
          headerRows: 1,
          widths: [60, 60, 220, 80, 80],
          body: tableBody,
      },
      // layout: 'headerLineOnly'
      layout: 'noBorders',
      // fontSize:12
      };

      content.push(table);

      content.push('\n')

      const docDefinition = {
          content,
          footer: function (currentPage, pageCount) {
          return {
              columns: [
              {
                  text: fechaActual.format('DD-MM-YYYY HH:mm:ss'), // Agrega la fecha actual a la izquierda
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
      res.status(500).json({ msg: 'Error al generar el pdf de pedidos por sucursales' });
  }


}

module.exports = {
    verCabecerasPedidosEnviados,
    verDetalleCabPedidosEnviadosPDF,
    verTotalPedidosEnviadosPDF,
    verTotalPedidosRecibidosPDF,
    verCabecerasPedidosRecibidos,
    verDetalleCabPedidosRecibidosPDF,
    verPedidosPorSucursalYmarcaPDF
}
  
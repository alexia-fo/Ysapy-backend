//!ADMINISTRACION

const { response } = require("express");
const { DInventario, Producto, Dinero, CInventario, Usuario, Sucursal, CRecepcion } = require("../model");
const { Sequelize, Op } = require("sequelize");
const DRendicion = require("../model/dRendicion");
const DRecepcion = require("../model/dRecepcion");
const DSalida = require("../model/dSalida");
const CSalida = require("../model/csalida");
const Salida = require("../model/salida");
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';
//Para transacciones
const sequelize = require('../db/conections');
    
//FIXME:para listar las cabeceras de inventarios en la tabla de inventarios
const obtenerCabecerasInventario = async (req = request, res = response)=> {
    //PARA OBTENER POR DEFECTO LOS INVENTARIOS DE LOS ULTIMOS 15 DIAS

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('YYYY-MM-DD');
    // Restar 15 días a la fecha actual
    const fechaHaceDias = fechaActual.subtract(15, 'days');
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHaceDiasFormateada = fechaHaceDias.format('YYYY-MM-DD');

    const {limite = fechaHoy, desde =fechaHaceDiasFormateada, sucursal='todos', estado='todos', turno='todos'} = req.query;
    
    let condiciones ={};

    try {

        if(!isNaN(sucursal)){
            condiciones.idsucursal=sucursal;
        }
    
        if(estado==='cerrados'){
            condiciones.estado='CC';
        }else if(estado==='abiertos'){
            condiciones.estado="CI"
        }
    
        if(turno==='manana'){
            condiciones.turno='M';
        }else if(turno==='tarde'){
            condiciones.turno=="T";
        }else if(turno==='noche'){
            condiciones.turno="N";
        }
      
        const [total, cabecera] = await Promise.all([
            CInventario.count({ where: { fechaApertura: { [Op.between]: [desde, limite] }, ...condiciones } }),
            CInventario.findAll({
                where: { 
                    [Op.and]: [
                        sequelize.where(sequelize.fn('DATE', sequelize.col('fechaApertura')), '>=', desde),
                        sequelize.where(sequelize.fn('DATE', sequelize.col('fechaApertura')), '<=', limite),
                    ],
                    ...condiciones },
                include: [{ model: Usuario, attributes: ['nombre'] }, { model: Sucursal, attributes: ['nombre'] }],
                order: [['fechaApertura', 'DESC']] // Ordena por fechaApertura en forma descendente
            })
        ]);  

        res.json({
            total,
            cabecera
        });   

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los inventarios"});
    }
}

//FIXME: para calcular las diferencias entre el inventario y la rendicion registrada. Obtener informacion 
const obtenerCalculo = async (req = request, res = response)=> {
    const {idCabecera}=req.params; 

    try {
        //en este punto ya se verificó si la cabecera existe
        const cabecera = await CInventario.findOne({ 
            where: {
                idCabecera
            } ,
            attributes:['fechaApertura', 'fechaCierre', 'turno', 'montoApertura', 'montoCierre', 'montoDiferencia', 'montoPendiente', 'montoOtrosCobros'],
            include: [
                {
                  model: Sucursal,
                  attributes: ['nombre'],
                },
              ],
        });
        
        // Consulta para obtener los campos del detalle de inventario
        const detalleInventario = await DInventario.findAll({
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
        });
        
        // Calcular el totalFinal sumando todos los valores de totalMultiplicado
        const totalVenta = detalleInventario.reduce((total, item) => {
            total += parseFloat(item.dataValues.totalMultiplicado);
            return total;
        }, 0);

        /*
            Dinero presente al momento de la apertura
        */
        const totalAperturaDinero = cabecera.montoApertura;
    
        /*
            Dinero en efectivo presente por cobros de ventas realizadas en el dia, sin tener en cuenta el cobro 
            de creditos de dias anteriores
        */
        const totalCierreDinero = cabecera.montoCierre;

        /*
            montoApertura-MontoCierre
        */
        const totalDiferenciaDinero = parseInt(cabecera.montoDiferencia);

        /*
            Dinero presente:pero no corresponde a la venta del dia, sino cobros por ventas a credito anteriores
        */
        const totalOtrosCobros = cabecera.montoOtrosCobros;
    
        /*  
            Dinero efectivo no presente: Creditos por cobrar,cobro con tarjetas y pago por productos recepcionados
        */
        const totalPendiente = parseInt(cabecera.montoPendiente);
        
        //total venta - (total cobrado + total pendiente)

        //TODO:ULTIMA MODIFICACION- LOS COBRADOS POR CREDITOS ANTERIORES SE DEBERIAN RESTAR DE LA RENDICION TOTAL DE DINERO
        //TODO: PQ TODO EL DINERO SE CUENTA DE UNA VEZ Y SE DEBERIA DE RESTAR EL DINERO ESPECIFICADO COMO COBRADO POR CREDITOS ANTERIORES
        
        // const diferenciaVentaCaja=totalVenta-(totalDiferenciaDinero+totalPendiente);
        const diferenciaVentaCaja=totalVenta-(totalDiferenciaDinero+totalPendiente-totalOtrosCobros);

        let descVentaCaja='';
    
        if(diferenciaVentaCaja<0){//si la venta es inferior a lo cobrado hay sobrante
            descVentaCaja='Sobrante';
        }else if(diferenciaVentaCaja>0){//si la venta es superior a lo cobrado hay faltante
            descVentaCaja='Faltante';
        }else if(diferenciaVentaCaja==0){
            descVentaCaja='Exacto'
        }else{
            descVentaCaja='Hubo algun error'
        }
    
        res.json({
            totalVenta,
            totalAperturaDinero,
            totalCierreDinero,
            totalDiferenciaDinero,
            totalOtrosCobros,
            totalPendiente,
            diferenciaVentaCaja,
            descVentaCaja,
            //agregado para mostrar datos inventario como sucursal, fecha, etc en front
            cabecera
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los calculos de la rendicion" });
    }
}

//FIXME: listar las cantidades de apertura y cierre de dinero
const obtenerDetalleRendicion=async (req, res)=>{
    const {idCabecera}=req.params;

    const [cabecera, detalleRendicion] =await Promise.all([
        CInventario.findOne({ 
            where: {
                idCabecera
            } ,
            attributes:['fechaApertura', 'fechaCierre', 'turno'],
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

    
    res.json({
        cabecera,
        detalleRendicion,
    });
}

//FIXME: listar las cantidades de apertura y cierre de cada producto
const obtenerDetalleInventario = async(req, res)=>{
    const {idCabecera}=req.params;

    const [cabecera, detalleInventario] =await Promise.all([
        CInventario.findOne({ 
            where: {
                idCabecera
            } ,
            attributes:['fechaApertura', 'fechaCierre', 'turno'],
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


    res.json({
        detalleInventario,
        cabecera
    });
}

/*FIXME: obtener todas las recepciones que tuvo un producto durante una rendicion */
const obtenerDetalleRecepcion = async (req = request, res = response)=> {
    const {idCabecera}=req.query;
    const {idProducto}=req.query;

    //En este punto ya se ha validado si existe la cabecera y el producto
    
    // Primero, buscamos el DRecepcion con el idProducto y el idCInventario proporcionados
    const [cabecera, dRecepcion] =await Promise.all([
        CInventario.findOne({ 
            where: {
                idCabecera
            } ,
            attributes:['fechaApertura', 'fechaCierre', 'turno'],
            include: [
                {
                  model: Sucursal,
                  attributes: ['nombre'],
                },
              ],
        }),
        DRecepcion.findAll({
            where: { idproducto: idProducto },
            include: [
            {
                model: CRecepcion,
                where: { idcabinventario: idCabecera },
                include: [{ model: Usuario, attributes:[ 'nombre'] }],
            },{
                model: Producto, attributes:[ 'nombre']
            }
            ],
        })
    ])

    if (!dRecepcion) {
        return res.status(500).json({ msg: 'Producto no encontrado en el inventario proporcionado' });
    }

    res.json({
        dRecepcion,
        cabecera
    });
    
}

//Obtener todas las recepciones realizadas en un inventario
const obtenerRecepciones = async (req, res = response) => {
    const {idCabecera}=req.query;

    try {

        const [cabecera, dRecepcion] =await Promise.all([
            CInventario.findOne({ 
                where: {
                    idCabecera
                } ,
                attributes:['fechaApertura', 'fechaCierre', 'turno'],
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
                        attributes:['fecha', 'observacion', 'nroComprobante','estado', 'idcabinventario']
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
    
        res.json({
            dRecepcion,
            cabecera
        });

    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener los datos de la recepcion:'});//+error.message
    }
};

//FIXME: obtener todas las salidas que tuvo un producto durante una rendicion
const obtenerDetalleSalida = async (req = request, res = response)=> {
    const {idCabecera}=req.query;
    const {idProducto}=req.query;
    
    const [cabecera, dSalida] =await Promise.all([
        CInventario.findOne({ 
            where: {
                idCabecera
            } ,
            attributes:['fechaApertura', 'fechaCierre', 'turno'],
            include: [
                {
                  model: Sucursal,
                  attributes: ['nombre'],
                },
              ],
        }),
        DSalida.findAll({
        where: { idproducto: idProducto },
        include: [
        {
            model: CSalida,
            where: { idcabinventario: idCabecera },
            include: [{ model: Usuario, attributes:[ 'nombre'] }],
        },{
            model: Producto, attributes:[ 'nombre'],
        },{
            model: Salida, attributes:[ 'descripcion']  
        }
        ],
        })
    ]);



    if (!dSalida) {
        return res.status(500).json({ msg: 'Producto no encontrado en el inventario proporcionado' });
    }
    
    res.json({
        dSalida,
        cabecera
    });
        
}

const obtenerSalidas = async (req = request, res = response)=> {
    const {idCabecera}=req.query;
    
    try {

        const [cabecera, dSalida] =await Promise.all([
            CInventario.findOne({ 
                where: {
                    idCabecera
                } ,
                attributes:['fechaApertura', 'fechaCierre', 'turno'],
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
                    attributes:['fecha', 'idCabecera']
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
        ])

        if (!dSalida) {
            return res.status(500).json({ msg: 'Producto no encontrado en el inventario proporcionado' });
        }
        
        res.json({
            dSalida,
            cabecera
        });

    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener los datos de la salida'});//+error.message
    }
}


//TODO: ESTOS CONTROLADORES SEARAN UTILIZADOS PARA EDITAR INVENTARIOS, RECEPCIONES YA REGISTRADAS, POR PARTE DEL ADMINISTRADOR
//para editar los datos de un solo producto
const editarCantidadProducto = async (req= request, res=response) =>{
    
    try {
        const {idCabecera, idProducto} = req.params;
        const {cantidadApertura, cantidadCierre}=req.body;
    
        console.log('idCabecera ', idCabecera, '- idProducto ', idProducto);
    
        await DInventario.update({ cantidadApertura, cantidadCierre }, { where: { idcabecera: idCabecera, idproducto:idProducto }});
        
        res.status(200).json({msg:'Cantidad actualizada correctamente'});
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al actualizar la cantidad de inventario'});
    }

}
const editarPrecioProducto = async (req= request, res=response) =>{
    
    try {
        const {idCabecera, idProducto} = req.params;
        const {nuevoPrecio}=req.body;
    
        // console.log('idCabecera ', idCabecera, '- idProducto ', idProducto);
    
        console.log('----------------------------------')
        console.log('idCabecera, ', idCabecera, ' id producto ', idProducto)
        console.log('precio, ', nuevoPrecio)
        console.log('BUCANDO EL PRECIO', req.body)

        await DInventario.update({ precio:nuevoPrecio }, { where: { idcabecera: idCabecera, idproducto:idProducto }});
        

        res.status(200).json({msg:'Precio actualizado correctamente'});
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al actualizar la cantidad de inventario'});
    }

}

const editarCantidadesProductos = async (req = request, res = response) => {
    try {
      const { idCabecera } = req.params;
      const productosControles = req.body.productosControles;

      console.log('productosControles ', productosControles)
  
      const promises = productosControles.map(async (productoControl) => {
        const { idProducto, cantidadApertura, cantidadCierre } = productoControl;
        await DInventario.update(
          { cantidadApertura, cantidadCierre },
          { where: { idcabecera: idCabecera, idproducto: idProducto } }
        );
      });
  
      await Promise.all(promises);
  
      res.status(200).json({ msg: 'Cantidades actualizadas correctamente' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ msg: 'Error al actualizar las cantidades de inventario' });
    }
  };

  //todo: editar recepciones

//Obtener todas las recepciones realizadas en un inventario
const obtenerCabecerasRecepciones = async (req, res = response) => {
    const {idCabecera}=req.params;

    try {
  
            const cRecepcion = await CRecepcion.findAll({
                where:{idcabinventario: idCabecera},
                attributes:['idRecepcion', 'fecha', 'observacion', 'idusuario', 'nroComprobante', 'estado']
            });
            

            res.json({
                cRecepcion
            });

    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener los datos de la recepcion:'});//+error.message
    }
};

const obtenerDetalleRecepcionCab = async (req, res = response) => {
    const {idCabecera, idCabeceraRec}=req.params;

    // try {
  
            const dRecepcion = await DRecepcion.findAll({//se obtiene el precio del producto de dinventario pq es el que se utiliza durante la vigencia del inventario
                where: {
                },
                include: [
                    {
                        model: CRecepcion,
                        where: { idRecepcion: idCabeceraRec },
                        include: [
                        {
                            model:Usuario,
                            attributes:['nombre']
                        }
                        ],
                        attributes:['fecha', 'observacion', 'nroComprobante','estado', 'idcabinventario']
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
            });

            console.log(dRecepcion)
            

            res.json({
                dRecepcion
            });

    // } catch (error) {
    //     res.status(500).json({ msg: 'Error al obtener los datos de la recepcion:'});//+error.message
    // }
};
  
// const modificarEstadoRecepcion = async (req, res = response )=> {

//     let t; //para generar la transaccion
//     const {idCabRecepcion} = req.params;

//     // console.log('ejecutando delete recepcion - ', idCabRecepcion)
    
//     try {
//         t = await sequelize.transaction();
            
//         const recepcion = await CRecepcion.findByPk(idCabRecepcion);
      
//         await recepcion.update( { estado: !recepcion.estado }, {transaction:t});

//         res.status(200).json({msg:'Estado modificado correctamente'});
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({
//             msg: 'Error al actualizar el sucursal'
//         });
//     }
// };

const modificarEstadoRecepcion = async (req, res) => {
    let t; // para generar la transacción
    const { idCabRecepcion } = req.params;

    try {
        t = await sequelize.transaction();

        // Anular la cabecera de recepción
        const recepcion = await CRecepcion.findByPk(idCabRecepcion);
        nuevo=await recepcion.update({ estado: !recepcion.estado }, { transaction: t });

        const detalleRecepcion = await DRecepcion.findAll({
            attributes: ['idproducto', 'cantidad'],
            where: {
                '$Crecepcion.idcabinventario$': recepcion.idcabinventario,
                '$Crecepcion.estado$': 1, // Filtrar por recepciones activas
            },
            include: [
                {
                    model: CRecepcion,
                    attributes: [], // Evitar seleccionar campos de CRecepcion
                },
            ],
            transaction: t,
        });

// ... Código previo ...

// Consultar la suma del detalle de recepción, incluyendo todos los registros
const detalleRecepcionSumas = await DRecepcion.findAll({
    attributes: ['idproducto', [sequelize.fn('SUM', sequelize.literal('CASE WHEN Crecepcion.estado = 1 THEN Drecepcion.cantidad ELSE 0 END')), 'totalCantidad']],
    where: {
        '$Crecepcion.idcabinventario$': recepcion.idcabinventario,
    },
    include: [
        {
            model: CRecepcion,
            attributes: [], // Evitar seleccionar campos de CRecepcion
        },
    ],
    group: ['idproducto'],
    raw: true,
    transaction: t,
});


// Actualizar cantidadRecepcion en DInventario
for (const sumaDetalle of detalleRecepcionSumas) {
    const { idproducto, totalCantidad } = sumaDetalle;

    console.log('for con idProducto: ', idproducto, ' y suma ', totalCantidad);

    await DInventario.update(
        { cantidadRecepcion: totalCantidad || 0 }, // Usar 0 si totalCantidad es null o undefined
        { where: { idproducto }, transaction: t }
    );
}



        await t.commit(); // Confirmar la transacción
        res.status(200).json({ msg: 'Estado modificado correctamente' });
    } catch (error) {
        console.log(error);
        if (t) await t.rollback(); // Revertir la transacción en caso de error
        res.status(500).json({ msg: 'Error al actualizar el estado' });
    }

};


//FIXME: registrar las recepciones (tanto cabecera como detalle)
const registrarMasRecepcion = async (req, res = response) => { 
    let t; //para generar la transaccion
    
    try {

        // const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        // const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
        const idusuario=req.usuario.idUsuario
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

        const {observacion, nroComprobante, productos} = req.body;
        const {idCabecera} = req.params;
        
        //verificamos que ya exista una cabecera del inventario
        const cabecera = await CInventario.findAll({
            where: {
                idCabecera
            }
        });
        
        //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de rendicion de caja
        if(cabecera.length > 0){
            //COMIENZA LA TRANSACCION
            t = await sequelize.transaction();

            // const idCabecera=cabecera[0].dataValues.idCabecera;
            const idSucursal=cabecera[0].dataValues.idsucursal;

            const cab ={
                fecha:fechaTiempoHoy,
                observacion,
                idusuario,
                nroComprobante,
                idsucursal:idSucursal,
                idcabinventario:idCabecera
            }


            //insertamos la cabecera de la recepcion
            await CRecepcion.create(cab, { transaction: t });
                        
            const result = await sequelize.query('SELECT LAST_INSERT_ID() as lastId', {
                type: sequelize.QueryTypes.SELECT,
                transaction:t
              });
              
            const idRecepcion = result[0].lastId;

            const data = await Promise.all(
                productos.map(async (producto) => {
                    const { idProducto, cantidad } = producto;
                    
                    const prod = await Producto.findByPk(idProducto);
                
                    if (!prod) {
                        throw new Error(`El producto con id ${idProducto} no existe`);
                        // t.rollback();
                        // res.status(409).send({msg:`El producto con id ${idProducto} no existe`});
                    }
                
                    // Recuperar el registro de DInventario correspondiente al producto y cabecera
                    let inventario = await DInventario.findOne({
                        where: { idproducto: idProducto, idcabecera: idCabecera },
                        transaction: t
                    });
                
                    if (!inventario) {
                        
                        productoRegistrar={
                            idcabecera:idCabecera,
                            idusuario:idusuario,
                            idproducto:idProducto,
                            cantidadApertura:0,
                            // cantidadCierre:0,//no se si agregar, si no va a generar inconsistencias al verificar cantidadCierre en FUNCIONARIO
                            precio:prod.precio,
                            totalApertura:0,
                            // totalCierre:0
                        }

                        const filaInsertar = new DInventario(productoRegistrar);
                        await filaInsertar.save({ transaction: t });

                        inventario = await DInventario.findOne({
                            where: { idproducto: idProducto, idcabecera: idCabecera },
                            transaction: t
                        });
                        
                        //todo:throw new Error(`No se encontró un registro en DInventario para el producto con id ${idProducto} y la cabecera con id ${idCabecera}`);
                        
                        // t.rollback();
                        // res.status(409).send({msg:`El producto con id ${idProducto} no encontrado`});
                    }
                
                    //actualizamos el detalle de inventario de los productos, aumentando las cantidades recepcionadas
           
                    if (inventario.cantidadRecepcion === null) {
                        console.log('cantidad de recepcion nul')
                        inventario.cantidadRecepcion = cantidad;
                    } else {
                        console.log('cantidad de recepcion no null')
                        inventario.cantidadRecepcion += cantidad;
                    }
                    console.log('antes guardar')
                    await inventario.save({ transaction: t });
                    console.log('despues guardar')
                
                    return {
                        idcrecepcion: idRecepcion,
                        idproducto: idProducto,
                        cantidad: cantidad,
                        //TODO:Se utilizará el precio de producto del detalle de inventario
                        // total: cantidad * prod.precio,
                        total: cantidad * inventario.dataValues.precio,
                    };
                })
            );
                  
            //insertamos el detalle de la recepcion
            await DRecepcion.bulkCreate(await Promise.all(data), {
                transaction: t,
            });     
        
            await t.commit();

            res.status(201).json({msg:"Recepción Registrada correctamente"});

            
        }else{
            res.status(500).send({msg:"No existe ninguna apertura"});
        }
        


    } catch (error) {
      if (t) await t.rollback(); // Verificar que t esté definido antes de llamar a rollback()
      res.status(500).json({msg:'Error al realizar la transacción'});
    }
  };

  //todo: editar salidas

//Obtener todas las recepciones realizadas en un inventario
const obtenerCabecerasSalidas = async (req, res = response) => {
    const {idCabecera}=req.params;

    try {
  
            const cSalida = await CSalida.findAll({
                where:{idcabinventario: idCabecera},
                attributes:['idCabecera', 'fecha', 'observacion', 'idusuario', 'estado']
            });
            

            res.json({
                cSalida
            });

    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener los datos de la salida:'});//+error.message
    }
};

const obtenerDetalleSalidaCab = async (req, res = response) => {
    const {idCabecera, idCabeceraSal}=req.params;
    console.log('----',idCabeceraSal)

    try {
  
            const dSalida = await DSalida.findAll({//se obtiene el precio del producto de dinventario pq es el que se utiliza durante la vigencia del inventario
                where: {
                },
                include: [
                    {
                        model: CSalida,
                        where: { idCabecera: idCabeceraSal },
                        include: [
                        {
                            model:Usuario,
                            attributes:['nombre']
                        }
                        ],
                        attributes:['fecha', 'observacion','estado', 'idcabinventario']
                    },
                    {
                        model: Producto,
                        attributes: ['nombre'],
                    
                    }
                ],
                attributes: ['cantidad', 'idproducto', 'idcsalida', 'total', 
                    [
                        // sequelize.literal(`(SELECT precio FROM DInventario WHERE DInventario.idproducto = DRecepcion.idproducto AND DInventario.idcabecera=${idCabecera})`),
                        

                         sequelize.literal(`(SELECT precio FROM dinventario WHERE dinventario.idproducto = Dsalida.idproducto AND dinventario.idcabecera=${idCabecera})`),
                        

                        'precio'
                     ]
                ],
            });

            console.log(dSalida)
            

            res.json({
                dSalida
            });

    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener los detalles de la salida:'});//+error.message
    }
};
  
const modificarEstadoSalida = async (req, res) => {
    let t; // para generar la transacción
    const { idCabeceraSal } = req.params;

    try {
        t = await sequelize.transaction();

        // Anular la cabecera de recepción
        const salida = await CSalida.findByPk(idCabeceraSal);
        console.log('la salida es, ', salida)
        nuevo=await salida.update({ estado: !salida.estado }, { transaction: t });
        
        console.log('nuevo, ', nuevo)
        
        const detalleSalida = await DSalida.findAll({
            attributes: ['idproducto', 'cantidad'],
            where: {
                '$Csalida.idcabinventario$': salida.idcabinventario,
                '$Csalida.estado$': 1, // Filtrar por recepciones activas
            },
            include: [
                {
                    model: CSalida,
                    attributes: [], // Evitar seleccionar campos de CRecepcion
                },
            ],
            transaction: t,
        });

        // ... Código previo ...

        // Consultar la suma del detalle de recepción, incluyendo todos los registros
        const detalleSalidaSumas = await DSalida.findAll({
            attributes: ['idproducto', [sequelize.fn('SUM', sequelize.literal('CASE WHEN Csalida.estado = 1 THEN Dsalida.cantidad ELSE 0 END')), 'totalCantidad']],
            where: {
                '$Csalida.idcabinventario$': salida.idcabinventario,
            },
            include: [
                {
                    model: CSalida,
                    attributes: [], // Evitar seleccionar campos de CRecepcion
                },
            ],
            group: ['idproducto'],
            raw: true,
            transaction: t,
        });

        // Actualizar cantidadRecepcion en DInventario
        for (const sumaDetalle of detalleSalidaSumas) {
            const { idproducto, totalCantidad } = sumaDetalle;

            await DInventario.update(
                { cantidadSalida: totalCantidad || 0 }, // Usar 0 si totalCantidad es null o undefined
                { where: { idproducto }, transaction: t }
            );
        }

        await t.commit(); // Confirmar la transacción
        res.status(200).json({ msg: 'Estado de salida modificado correctamente' });
    } catch (error) {
        console.log(error);
        if (t) await t.rollback(); // Revertir la transacción en caso de error
        res.status(500).json({ msg: 'Error al actualizar el estado' });
    }

};


//FIXME: registrar las recepciones (tanto cabecera como detalle)
const registrarMasSalida = async (req, res = response) => { 
    let t; //para generar la transaccion
    
    try {

        // const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        // const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
        const idusuario=req.usuario.idUsuario
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

        const {observacion, productos} = req.body;
        const {idCabecera} = req.params;
        
        //verificamos que ya exista una cabecera del inventario
        const cabecera = await CInventario.findAll({
            where: {
                idCabecera
            }
        });
        
        //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de rendicion de caja
        if(cabecera.length > 0){
            //COMIENZA LA TRANSACCION
            t = await sequelize.transaction();

            // const idCabecera=cabecera[0].dataValues.idCabecera;
            const idSucursal=cabecera[0].dataValues.idsucursal;

            const cab ={
                fecha:fechaTiempoHoy,
                observacion,
                idusuario,
                idsucursal:idSucursal,
                idcabinventario:idCabecera
            }


            //insertamos la cabecera de la recepcion
            await CSalida.create(cab, { transaction: t });
                        
            const result = await sequelize.query('SELECT LAST_INSERT_ID() as lastId', {
                type: sequelize.QueryTypes.SELECT,
                transaction:t
              });
              
            const idSalida = result[0].lastId;

            const data = await Promise.all(
                productos.map(async (producto) => {
                    const { idProducto, cantidad } = producto;
                    
                    const prod = await Producto.findByPk(idProducto);
                
                    if (!prod) {
                        throw new Error(`El producto con id ${idProducto} no existe`);
                        // t.rollback();
                        // res.status(409).send({msg:`El producto con id ${idProducto} no existe`});
                    }
                
                    // Recuperar el registro de DInventario correspondiente al producto y cabecera
                    let inventario = await DInventario.findOne({
                        where: { idproducto: idProducto, idcabecera: idCabecera },
                        transaction: t
                    });
                
                    if (!inventario) {
                        
                        productoRegistrar={
                            idcabecera:idCabecera,
                            idusuario:idusuario,
                            idproducto:idProducto,
                            cantidadApertura:0,
                            // cantidadCierre:0,// cantidadCierre:0,//no se si agregar, si no va a generar inconsistencias al verificar cantidadCierre en FUNCIONARIO
                            precio:prod.precio,
                            totalApertura:0,
                            // totalCierre:0
                        }

                        const filaInsertar = new DInventario(productoRegistrar);
                        await filaInsertar.save({ transaction: t });

                        inventario = await DInventario.findOne({
                            where: { idproducto: idProducto, idcabecera: idCabecera },
                            transaction: t
                        });
                        
                        //todo:throw new Error(`No se encontró un registro en DInventario para el producto con id ${idProducto} y la cabecera con id ${idCabecera}`);
                        
                        // t.rollback();
                        // res.status(409).send({msg:`El producto con id ${idProducto} no encontrado`});
                    }
                
                    //actualizamos el detalle de inventario de los productos, aumentando las cantidades recepcionadas
           
                    if (inventario.cantidadSalida === null) {
                        console.log('cantidad de recepcion nul')
                        inventario.cantidadSalida = cantidad;
                    } else {
                        console.log('cantidad de recepcion no null')
                        inventario.cantidadSalida += cantidad;
                    }
                    console.log('antes guardar')
                    await inventario.save({ transaction: t });
                    console.log('despues guardar')
                
                    return {
                        idcsalida: idSalida,
                        idproducto: idProducto,
                        cantidad: cantidad,
                        //TODO:Se utilizará el precio de producto del detalle de inventario
                        // total: cantidad * prod.precio,
                        total: cantidad * inventario.dataValues.precio,
                    };
                })
            );
                  
            //insertamos el detalle de la recepcion
            await DSalida.bulkCreate(await Promise.all(data), {
                transaction: t,
            });     
        
            await t.commit();

            res.status(201).json({msg:"Salida Registrada correctamente"});

            
        }else{
            res.status(500).send({msg:"No existe ninguna apertura"});
        }
        


    } catch (error) {
      if (t) await t.rollback(); // Verificar que t esté definido antes de llamar a rollback()
      res.status(500).json({msg:'Error al realizar la transacción'});
    }
  };

  const pruebaGetParaJava = async (req, res) => {
  
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
        
        res.send(productosComparados);
        // res.status(200).json(pdfData);
      
      
    } catch (error) {
      // res.setHeader('Content-Type', 'application/json');
      console.error('Error en el controlador inventariosConsecutivos:', error);
      res.status(500).json({msg: 'Error al obtener el pdf '});
    }
  };
  
module.exports={
    obtenerCabecerasInventario,
    obtenerCalculo,
    obtenerDetalleInventario,
    obtenerDetalleRendicion,
    obtenerDetalleRecepcion,
    obtenerRecepciones,
    obtenerDetalleSalida,
    obtenerSalidas,
    
    editarCantidadProducto,
    editarPrecioProducto,
    editarCantidadesProductos,

    obtenerCabecerasRecepciones,
    obtenerDetalleRecepcionCab,
    modificarEstadoRecepcion,
    registrarMasRecepcion,


    obtenerCabecerasSalidas,
    obtenerDetalleSalidaCab,
    modificarEstadoSalida,
    registrarMasSalida,

    pruebaGetParaJava
}

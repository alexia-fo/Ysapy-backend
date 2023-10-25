const { response } = require("express");
const sequelize = require('../db/conections');
const { Op } = require('sequelize');
const { Producto, CInventario, CRecepcion, DInventario, Dinero, Drecepcion } = require("../model");
const DRecepcion = require("../model/dRecepcion");
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';
const DSalida = require("../model/dSalida");
const CSalida = require("../model/csalida");

//! -- SOLO PARA SERVICIOS DE FUNICIONARIO (RECEPCIONES DE PRODUCTOS)--



// const verExisteApertura = async (req, res = response) => {
//     try { 
//         // Existe una apertura en una sucursal, en un turno, en una fecha ?... el usuario no importa, cualquiera de los dos pueden generar
//         const idSucursal = req.usuario.idsucursal; // para obtener la cabecera de esta sucursal
//         const turno = req.usuario.turno;

//         // Obtener la fecha actual según la zona horaria de Paraguay
//         const fechaActual = moment().tz(zonaHorariaParaguay);

//         // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
//         const fechaHoy = fechaActual.format('YYYY-MM-DD');

//         // Para el response
//         let habilitar = false;
//         let descripcion = '';
//         let fechaApertura = null; // Agrega esta variable para almacenar la fecha de apertura
//         let idCabecera = null; // Agrega esta variable para almacenar el ID de la cabecera

//         // Verificamos que ya exista una cabecera del inventario
//         const cabecera = await CInventario.findAll({
//             where: {
//                 idsucursal: idSucursal,
//                 turno: turno,
//                 [Op.and]: sequelize.where(
//                     sequelize.fn('DATE', sequelize.col('fechaApertura')),
//                     fechaHoy
//                 ),
//             }
//         });

//         if (cabecera.length > 0) {
//             idCabecera = cabecera[0].dataValues.idCabecera; // Obtenemos el ID de la cabecera
//             fechaApertura = cabecera[0].dataValues.fechaApertura; // Obtenemos la fecha de apertura

//             // Verificamos que ya exista un detalle del inventario
//             const detalle = await DInventario.findAll({
//                 where: {
//                     idcabecera: idCabecera,
//                 }
//             });

//             if (detalle.length > 0) {
//                 habilitar = true;
//                 descripcion = 'El detalle de la apertura de inventario ya se ha registrado..';
//             } else {
//                 habilitar = false;
//                 descripcion = 'El detalle de la apertura de inventario aún no se ha registrado';
//             }
//         } else { // NO EXISTE APERTURA
//             habilitar = false;
//             descripcion = 'La apertura del día está pendiente..';
//         }
//                                                                     //null si no hay en fecha y id
//         res.status(200).send({ habilitado: habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera }); // Enviamos fechaApertura e idCabecera al frontend

//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ msg: 'Error al verificar disponibilidad de inventario' });
//     }
// }

const verExisteApertura = async (req, res = response) => {
    try { 
        // Existe una apertura en una sucursal, en un turno, en una fecha ?... el usuario no importa, cualquiera de los dos pueden generar
        const idSucursal = req.usuario.idsucursal; // para obtener la cabecera de esta sucursal
        
        const turno = req.usuario.turno;

        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);

        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');

        // Para el response
        let habilitar = false;
        let descripcion = '';
        let fechaApertura = null; // Agrega esta variable para almacenar la fecha de apertura
        let idCabecera = null; // Agrega esta variable para almacenar el ID de la cabecera

        let proximoNroComprobante;

        // Verificamos que ya exista una cabecera del inventario
        const cabecera = await CInventario.findAll({
            where: {
                idsucursal: idSucursal,
                turno: turno,
                [Op.and]: sequelize.where(
                    sequelize.fn('DATE', sequelize.col('fechaApertura')),
                    fechaHoy
                ),
            }
        });

        if (cabecera.length > 0) {
            idCabecera = cabecera[0].dataValues.idCabecera; // Obtenemos el ID de la cabecera
            fechaApertura = cabecera[0].dataValues.fechaApertura; // Obtenemos la fecha de apertura
            estado = cabecera[0].dataValues.estado; // si la cabecera ya se cerro no se puede registrar mas recepciones

            // Verificamos que ya exista un detalle del inventario
            const detalle = await DInventario.findAll({
                where: {
                    idcabecera: idCabecera,
                }
            });

            /*TODO:si no se tiene en cuenta que el inventario aun no se encuentra cerrado(para registrar recepciones)
                        if (detalle.length > 0) {
                            habilitar = true;
                            descripcion = 'El detalle de la apertura de inventario ya se ha registrado..';
                        } else {
                            habilitar = false;
                            descripcion = 'El detalle de la apertura de inventario aún no se ha registrado';
                        }
            */
            if (detalle.length > 0) {
                if(!(estado==="CI" || estado==="CC" )){
                    habilitar = true;
                    descripcion = 'El detalle de la apertura de inventario ya se ha registrado..';
                }else{
                    habilitar = false;
                    descripcion = 'El inventario ya se ha cerrado..';
                }
            } else {
                habilitar = false;
                descripcion = 'El detalle de la apertura de inventario aún no se ha registrado';
            }


            // Consultar el último nroComprobante de CRecepcion
            const ultimoComprobante = await CRecepcion.findOne({
                attributes: [
                    [sequelize.fn('max', sequelize.col('nroComprobante')), 'ultimoComprobante']
                ],
                where: {
                    idsucursal: idSucursal,
                    idcabinventario: idCabecera
                }
            });

            proximoNroComprobante = 1;

            if (ultimoComprobante && ultimoComprobante.dataValues.ultimoComprobante !== null) {
                proximoNroComprobante = parseInt(ultimoComprobante.dataValues.ultimoComprobante, 10) + 1;
            }
        } else { // NO EXISTE APERTURA
            habilitar = false;
            descripcion = 'La apertura del día está pendiente..';
        }
                                                                    //null si no hay en fecha y id
        res.status(200).send({ habilitado: habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera, proximoNroComprobante }); // Enviamos fechaApertura e idCabecera al frontend

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'Error al verificar disponibilidad de inventario' });
    }
}

//para la ventana que permite visualizar las recepciones
const visualizacionDisponible = async (req, res = response) => {
    try { 
        // Existe una apertura en una sucursal, en un turno, en una fecha ?... el usuario no importa, cualquiera de los dos pueden generar
        const idSucursal = req.usuario.idsucursal; // para obtener la cabecera de esta sucursal
        
        const turno = req.usuario.turno;

        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);

        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');

        // Para el response
        let habilitar = false;
        let descripcion = '';
        let fechaApertura = null; // Agrega esta variable para almacenar la fecha de apertura
        let idCabecera = null; // Agrega esta variable para almacenar el ID de la cabecera

        let proximoNroComprobante;

        // Verificamos que ya exista una cabecera del inventario
        const cabecera = await CInventario.findAll({
            where: {
                idsucursal: idSucursal,
                turno: turno,
                [Op.and]: sequelize.where(
                    sequelize.fn('DATE', sequelize.col('fechaApertura')),
                    fechaHoy
                ),
            }
        });

        if (cabecera.length > 0) {
            idCabecera = cabecera[0].dataValues.idCabecera; // Obtenemos el ID de la cabecera
            fechaApertura = cabecera[0].dataValues.fechaApertura; // Obtenemos la fecha de apertura
            estado = cabecera[0].dataValues.estado; // si la cabecera ya se cerro no se puede registrar mas recepciones

            // Verificamos que ya exista un detalle del inventario
            const detalle = await DInventario.findAll({
                where: {
                    idcabecera: idCabecera,
                }
            });

                        if (detalle.length > 0) {
                            habilitar = true;
                            descripcion = 'El detalle de la apertura de inventario ya se ha registrado..';
                        } else {
                            habilitar = false;
                            descripcion = 'El detalle de la apertura de inventario aún no se ha registrado';
                        }
            


            // Consultar el último nroComprobante de CRecepcion
            const ultimoComprobante = await CRecepcion.findOne({
                attributes: [
                    [sequelize.fn('max', sequelize.col('nroComprobante')), 'ultimoComprobante']
                ],
                where: {
                    idsucursal: idSucursal,
                    idcabinventario: idCabecera
                }
            });

            proximoNroComprobante = 1;

            if (ultimoComprobante && ultimoComprobante.dataValues.ultimoComprobante !== null) {
                proximoNroComprobante = parseInt(ultimoComprobante.dataValues.ultimoComprobante, 10) + 1;
            }
        } else { // NO EXISTE APERTURA
            habilitar = false;
            descripcion = 'La apertura del día está pendiente..';
        }
                                                                    //null si no hay en fecha y id
        res.status(200).send({ habilitado: habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera, proximoNroComprobante }); // Enviamos fechaApertura e idCabecera al frontend

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'Error al verificar disponibilidad de inventario' });
    }
}

const registrarRecepcion = async (req, res = response) => { 
    let t; //para generar la transaccion
    try {

        const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
        const idusuario=req.usuario.idUsuario
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
        const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

        

        
        const {observacion, nroComprobante, productos} = req.body;
        
        //verificamos que ya exista una cabecera del inventario
        const cabecera = await CInventario.findAll({
            where: {
                idsucursal: idSucursal,
                turno,
                [Op.and]: sequelize.where(
                    sequelize.fn('DATE', sequelize.col('fechaApertura')),
                    fechaHoy
                )
            }
        });
        
        //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de rendicion de caja
        if(cabecera.length > 0){
            //COMIENZA LA TRANSACCION
            t = await sequelize.transaction();

            const idCabecera=cabecera[0].dataValues.idCabecera;

            const cab ={
                fecha:fechaTiempoHoy,
                observacion,
                idusuario,
                nroComprobante,
                idsucursal:idSucursal,
                idcabinventario:idCabecera
            }
            console.log("--------Fecha tiempo de hoy cabecera")
            console.log(cab);

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
                    const inventario = await DInventario.findOne({
                        where: { idproducto: idProducto, idcabecera: idCabecera },
                        transaction: t
                    });
                
                    if (!inventario) {
                        throw new Error(`No se encontró un registro en DInventario para el producto con id ${idProducto} y la cabecera con id ${idCabecera}`);
                        // t.rollback();
                        // res.status(409).send({msg:`El producto con id ${idProducto} no encontrado`});
                    }
                
                    //actualizamos el detalle de inventario de los productos, aumentando las cantidades recepcionadas
                    if (inventario.cantidadRecepcion === null) {
                        inventario.cantidadRecepcion = cantidad;
                    } else {
                        inventario.cantidadRecepcion += cantidad;
                    }
                    await inventario.save({ transaction: t });
                
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

//   const visualizarRecepciones = async (req, res = response) => {
//     // try {
//         const idSucursal = req.usuario.idsucursal;
//         const turno = req.usuario.turno;
//         const idusuario = req.usuario.idUsuario;

//         const fechaActual = moment().tz(zonaHorariaParaguay);
//         const fechaHoy = fechaActual.format('YYYY-MM-DD');

//         const cabecera = await CInventario.findAll({
//             where: {
//                 idsucursal: idSucursal,
//                 turno,
//                 [Op.and]: sequelize.where(
//                     sequelize.fn('DATE', sequelize.col('fechaApertura')),
//                     fechaHoy
//                 )
//             }
//         });

//         if (cabecera.length > 0) {
//             const idCabecera = cabecera[0].dataValues.idCabecera;

//             const dRecepcion = await DRecepcion.findAll({
//                 where: {},
//                 include: [
//                     {
//                         model: CRecepcion,
//                         where: { idcabinventario: idCabecera },
//                         include: [],
//                     },
//                     {
//                         model: Producto,
//                         attributes: ['nombre'],
//                     },
//                     {
//                         model: DInventario,
//                         attributes: ['precio'],
//                         where: {
//                             idproducto: sequelize.col('Producto.idproducto') // Condición de igualdad
//                         }
//                     }
//                 ],
//                 attributes: ['cantidad']
//             });

//             res.json({
//                 dRecepcion
//             });
//         } else {
//             res.status(500).send({ msg: "No existe ninguna apertura" });
//         }
//     // } catch (error) {
//     //     res.status(500).json({ msg: 'Error al realizar la transacción' });
//     // }
// };


  //!

  const visualizarRecepciones = async (req, res = response) => {
    try {
        const idSucursal = req.usuario.idsucursal;
        const turno = req.usuario.turno;
        const idusuario = req.usuario.idUsuario;

        const fechaActual = moment().tz(zonaHorariaParaguay);
        const fechaHoy = fechaActual.format('YYYY-MM-DD');

        const cabecera = await CInventario.findAll({
            where: {
                idsucursal: idSucursal,
                turno,
                [Op.and]: sequelize.where(
                    sequelize.fn('DATE', sequelize.col('fechaApertura')),
                    fechaHoy
                )
            }
        });

        if (cabecera.length > 0) {
            const idCabecera = cabecera[0].dataValues.idCabecera;
            /*
            const dRecepcion = await DRecepcion.findAll({
                where: {},
                include: [
                    // {
                    //     model: CRecepcion,
                    //     where: { idcabinventario: idCabecera },
                    //     include: [],
                    // },
                    {
                        model: Producto,
                        attributes: ['nombre'],
                        include: [
                            {
                                model: DInventario,
                                attributes: ['precio', 'idproducto'],
                                where: {
                                    [Op.and]: [
                                        { idproducto: sequelize.col('Producto.idproducto') }, // Condición de igualdad
                                        { idcabecera: idCabecera }
                                    ]
                                }
                            //     // where: {
                            //     //     idproducto: sequelize.col('Producto.idproducto'), // Condición de igualdad
                            //     //     idcabecera:idCabecera
                            //     // }
                            }
                        ]
                    },
                ],
                attributes: ['cantidad', 'idproducto', 'idcrecepcion', 'total'], 
            });
            */
            const dRecepcion = await DRecepcion.findAll({
                where: {},
                include: [
                    {
                        model: CRecepcion,
                        where: { idcabinventario: idCabecera },
                        include: [],
                        attributes:['fecha']
                    },
                    {
                        model: Producto,
                        attributes: ['nombre', 'idproducto'],
                    }
                ],
                attributes: ['cantidad', 'idproducto', 'idcrecepcion', 'total', 
                    [
                        sequelize.literal(`(SELECT precio FROM DInventario WHERE DInventario.idproducto = DRecepcion.idproducto AND DInventario.idcabecera=${idCabecera})`),
                        'precio'
                    ]
                ],
            });
            

            res.json({
                dRecepcion
            });
        } else {
            res.status(500).send({ msg: "No existe ninguna apertura" });
        }
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener los datos de la recepcion' });
    }
};


  //!

//   const visualizarRecepciones = async (req, res = response) => {
//     // try {
//         const idSucursal = req.usuario.idsucursal;
//         const turno = req.usuario.turno;
//         const idusuario = req.usuario.idUsuario;

//         const fechaActual = moment().tz(zonaHorariaParaguay);
//         const fechaHoy = fechaActual.format('YYYY-MM-DD');

//         const cabecera = await CInventario.findAll({
//             where: {
//                 idsucursal: idSucursal,
//                 turno,
//                 [Op.and]: sequelize.where(
//                     sequelize.fn('DATE', sequelize.col('fechaApertura')),
//                     fechaHoy
//                 )
//             }
//         });

//         if (cabecera.length > 0) {
//             const idCabecera = cabecera[0].dataValues.idCabecera;

//             const dRecepcion = await DRecepcion.findAll({
//                 where: {},
//                 include: [
//                     {
//                         model: CRecepcion,
//                         where: { idcabinventario: idCabecera },
//                         include: [],
//                     },
//                     {
//                         model: Producto,
//                         attributes: ['nombre'],
//                         include: [
//                             {
//                                 model: DInventario,
//                                 attributes: ['precio'],
//                             }
//                         ]
//                     },
//                 ],
//                 attributes: ['cantidad']
//             });

//             res.json({
//                 dRecepcion
//             });
//         } else {
//             res.status(500).send({ msg: "No existe ninguna apertura" });
//         }
//     // } catch (error) {
//     //     res.status(500).json({ msg: 'Error al realizar la transacción' });
//     // }
// };


//!

//   const visualizarRecepciones = async (req, res = response) => { 
//     try {

//         const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
//         const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
//         const idusuario=req.usuario.idUsuario;
//         // Obtener la fecha actual según la zona horaria de Paraguay
//         const fechaActual = moment().tz(zonaHorariaParaguay);
//         // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
//         const fechaHoy = fechaActual.format('YYYY-MM-DD');
                
//         //verificamos que ya exista una cabecera del inventario
//         const cabecera = await CInventario.findAll({
//             where: {
//                 idsucursal: idSucursal,
//                 turno,
//                 [Op.and]: sequelize.where(
//                     sequelize.fn('DATE', sequelize.col('fechaApertura')),
//                     fechaHoy
//                 )
//             }
//         });
        
//         //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de rendicion de caja
//         if(cabecera.length > 0){
//             //COMIENZA LA TRANSACCION
//             const idCabecera=cabecera[0].dataValues.idCabecera;

//             const dRecepcion = await DRecepcion.findAll({
//                 where: { },
//                 include: [
//                     {
//                         model: CRecepcion,
//                         where: { idcabinventario: idCabecera },
//                         include: [],
//                     },
//                     {
//                         model: Producto,
//                         include: [],
//                         attributes:['nombre']
//                     },
//                 ],
//             });

//             res.json({
//                 dRecepcion
//             });


//         }else{
//             res.status(500).send({msg:"No existe ninguna apertura"});
//         }

//     } catch (error) {
//       res.status(500).json({msg:'Error al realizar la transacción'});
//     }
//   };






// const productosRecepcion = async (req = request, res = response)=> {

//     try {
//         const [total,producto] = await Promise.all([
//             Producto.count({where: {activo:true, facturable:1}}),
//             Producto.findAll({
//                 where: {activo:true}
//             })
//         ]);

//         res.json({
//             total,
//             producto
//         });
    
//     } catch (error) {
//         res.status(500).json({msg: 'Error al obtener los productos para la recpcion'});
//     }

// }

module.exports = {
    // productosRecepcion,
    verExisteApertura,
    registrarRecepcion,
    visualizarRecepciones,
    visualizacionDisponible
}
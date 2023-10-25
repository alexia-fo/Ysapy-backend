//!FUNCIONARIO

const { response } = require("express");
//Para transacciones
const sequelize = require('../db/conections');
//Para operador AND, OR, etc..
const { Op } = require('sequelize');
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';

const {CInventario, Dinero, DInventario, Drendicion, Producto, Sucursal} = require('../model');
const DRendicion = require("../model/dRendicion");
const Salida = require("../model/salida");

//! PARA RECEPCIONES Y SALIDAS AL PRESIONAR ENTER EN EL ID DE PRODUCTO
const obtenerProductoPorId = async (req, res) => {
    try {
        // Obtén el idProducto de los parámetros de la URL
        const { id } = req.params;

        // Busca el producto en la base de datos por su idProducto
        const producto = await Producto.findOne({
            where: { idProducto: id },
            attributes: ['nombre'] // Especifica el nombre como el único atributo a recuperar
        });
        // Si el producto no se encuentra, devuelve un error 404
        if (!producto) {
            return res.status(404).json({ msg: "Producto no encontrado" });
        }

        // Si el producto se encuentra, devuélvelo en la respuesta
        res.status(200).json(producto);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Error al obtener el producto" });
    }
};

//! -- SOLO PARA SERVICIOS DE FUNICIONARIO (cabecera de inventario, detalle de inventario, rendicion de caja)--

//FIXME: 
//para verificar si se puede realizar una apertura en la cabecera de inventario
const verExisteApertura = async (req, res = response) => {
    try { 
        
        //Existe una apertura en: una sucursal, en un turno, en una fecha ?... el usuario no importa, cualquiera de los funcionarios puede generar
        
        const idSucursal= req.usuario.idsucursal; 
        const turno=req.usuario.turno;
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
        
        //para el response
        let habilitar=false;
        let descripcion='';
        
        //verificamos si ya exista la cabecera 
        const cabecera = await CInventario.findAll({
            where: {
                idsucursal: idSucursal,
                turno:turno,
                [Op.and]: sequelize.where(
                    sequelize.fn('DATE', sequelize.col('fechaApertura')),
                    fechaHoy
                ),
            }
            
        });   


 
        if(cabecera.length > 0){//Sí existe la cabecera
            const idCabecera=cabecera[0].dataValues.idCabecera;
            const fechaApertura=cabecera[0].dataValues.fechaApertura;

            habilitar=false;
            descripcion='Ya existe una apertura en este turno..';
                                      
            res.status(200).send({habilitado:habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera});    

        }else{//No existe la cabecera
            habilitar=true;
            descripcion='La apertura del dia esta disponible..';
            res.status(200).send({habilitado:habilitar, descripcion});             
        }

 
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al verificar el estado de inventario'});
    }
}

//FIXME:
//para mostrar la sucursal del empleado en la pantalla de apertura, si esta se encuentra disponible
const sucDeUsurio = async (req, res = response) => {
    try {
        id=req.usuario.idsucursal;
        const sucursal = await Sucursal.findByPk(id);  
    
        if(sucursal){
            res.json({
                sucursal,
            });
        }else{
            res.status(404).json({
                msg: `No existe la sucursal del usuario con id ${ id } `
            });
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al obtener la sucursal de usuario'});
    }
}

//FIXME:
//para registrar una cabecera de inventario
const crearApertura = async (req, res = response) => {
    //en este punto ya se valida si la apertura se encuentra disponible
    try {
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        // const fechaHoy = fechaActual.format('YYYY-MM-DD');
        const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

        const observacion=req.body.observacion;

        const data ={
            idsucursal: req.usuario.idsucursal,
            idusuario: req.usuario.idUsuario,
            turno:req.usuario.turno,
            fechaApertura:fechaTiempoHoy,
            observacion,
            estado:'AI'
        }

        const cinventario = new CInventario(data);

        await cinventario.save();

        res.status(201).json({msg:'Apertura registrada correctamente'});

    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al realizar la aperura'});      
    }
}

//FIXME:
// verificar que el detalle de inventario de productos este disponible
const verificarInventario = async (req, res = response) => { 

    try {

        const idSucursal = req.usuario.idsucursal; // para obtner la cabecera de esta sucursal
        const turno = req.usuario.turno; // para obtner la cabecera de esta sucursal
        
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
        
        //para el response        
        let habilitar=false;
        let descripcion='';
    
        //verificamos que ya exista una cabecera del inventario, de hoy, con mi sucursal y mi turno
        const cabecera = await CInventario.findAll({

            where: {
                idsucursal: idSucursal,
                turno:turno,
                [Op.and]: sequelize.where(
                    sequelize.fn('DATE', sequelize.col('fechaApertura')),
                    fechaHoy
                ),
            }  
        });
 
        //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de inventario
        
        if(cabecera.length > 0){//ya existe una cabecera de inventario             
 
            const idCabecera=cabecera[0].dataValues.idCabecera;
            const fechaApertura=cabecera[0].dataValues.fechaApertura;
            
            //TODO:para evitar consultar todos los registros 
            // const detalleI = await DInventario.findAll({
            //     where: {
            //         idcabecera: idCabecera,
            //     }
            // });
 
            const detalleI = await DInventario.findOne({
                where: {
                    idcabecera: idCabecera,
                }
            });

            //TODO:para evitar consultar todos los registros 
            //si la cantidad de registros es mayor a 0 ya existe un detalle de inventario de productos (apertura realizada)
            // if(detalleI.length>0){
            if(detalleI){//si la cantidad de registros es mayor a 0 ya existe un detalle de inventario de productos (apertura realizada)
                 
                //si ya hay un detalle de inventario este puede o no estar cerrado (si ya existe un total cierre en uno de sus registros, ya esta cerrada)
             
                //TODO:para evitar consultar todos los registros 
                //  if(detalleI[0].cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                const datosI=detalleI.dataValues;
                if(datosI.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                    habilitar=false;
                    descripcion='El detalle de inventario del turno ya se encuentra cerrada'
                }else{//el inventario aun no se encuentra cerrada 
                    //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de rendicion)
                    
                    //TODO:para evitar consultar todos los registros 
                    // const detalleR = await DRendicion.findAll({
                    //     where: {
                    //         idcabecera: idCabecera,
                    //     }
                    // });
                    const detalleR = await DRendicion.findOne({
                        where: {
                            idcabecera: idCabecera,
                        }
                    });

                    //TODO:para evitar consultar todos los registros 
                    // if(detalleR.length>0){
                    if(detalleR){
                        habilitar=true;//ya existe una apetura de rendicion - se pude realizar el cierre de inventario
                        descripcion='Cierre de inventario'
                    }else{
                        habilitar=false;//aun no se realizo una apertura de rendicion - no se puede realizar el cierre
                        descripcion='La apertura de rendicion aún se encuentra pendiente..'
                    }
                 }
                         
                 res.status(200).send({habilitado:habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera});    
            }else{//NO EXISTE DETALLE DE INVENTARIO PERO YA HAY UNA APERTURA EN CABECERA -entonces es una apertura de inventario
                res.status(200).json({habilitado:true, descripcion:'Apertura del inventario de productos', fechaApertura, idCabeceraInv:idCabecera});
            }
        }else{//no existe una cabecera de inventario
            res.status(200).json({habilitado:false, descripcion:'No existe ninguna apertura'});
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al verificar el detalle de inventario'});
    }
}

//FIXME:
const productosInventario = async (req = request, res = response)=> {
    try {
        const [total,producto] = await Promise.all([
            Producto.count({where: {activo:true, facturable:1}}),
            Producto.findAll({
                where: {activo:true, facturable:1}
            })
        ]);
        
        res.json({
            total,
            producto
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Error al obtener productos del inventario'});
    }

}

//FIXME:

const registrarInventario = async (req, res = response) => { 
    let t; //para generar la transaccion
    try {
        const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        // const fechaHoy = fechaActual.format('YYYY-MM-DD');
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
        const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

        const idUsuario=req.usuario.idUsuario;

        const obj = req.body.productos; //recibe un objeto q contiene todos los id's de productos y su cantidad
        const idsProducto = Object.keys(obj); //las llaves del objeto corresponden a los id's de cada producto
        
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

        //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de inventario
        
        if(cabecera.length > 0){//ya existe la cabecera de inventario

            //COMIENZA LA TRANSACCION
            t = await sequelize.transaction();

            const idCabecera=cabecera[0].dataValues.idCabecera;
            
            //TODO:para evitar consultar todos los registros 
            // const detalleI = await DInventario.findAll({
            //     where: {
            //         idcabecera: idCabecera,
            //     }
            // });
 
            const detalleI = await DInventario.findOne({
                where: {
                    idcabecera: idCabecera,
                }
            });

            //TODO:para evitar consultar todos los registros 
            //si la cantidad de registros es mayor a 0 ya se realizo una apertura del detalle de inventario de productos
            // if(detalleI.length > 0){//Actualizar registros si ya existe una apertura en el detalle de inventario
            if(detalleI){//Actualizar registros si ya existe una apertura en el detalle de inventario
                 
                //si ya hay un detalle de inventario este puede o no estar cerrado (si ya existe un total cierre en uno de sus registros, ya esta cerrada)
             
                //TODO:para evitar consultar todos los registros 
                //  if(detalleI[0].cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                const datosI=detalleI.dataValues;
                if(datosI.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                    throw new Error(`El inventario del turno ya se encuentra cerrada`);
                    // t.rollback();
                    // res.status(409).send({msg:"El inventario del turno ya se encuentra cerrada"});
                }else{//el inventario aun no se encuentra cerrada - cierre del detalle de inventario de productos
                    //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de rendicion)
                    
                    //TODO:para evitar consultar todos los registros 
                    // const detalleR = await DRendicion.findAll({
                    //     where: {
                    //         idcabecera: idCabecera,
                    //     }
                    // });
                    const detalleR = await DRendicion.findOne({
                        where: {
                            idcabecera: idCabecera,
                        }
                    });

                    //TODO:para evitar consultar todos los registros 
                    // if(detalleR.length>0){
                    if(!detalleR){
                        throw new Error(`La apertura debe estar finalizada (FALTA RENDICION)`); 
                        // t.rollback();
                        // res.status(409).send({msg:"La apertura debe estar finalizada (FALTA RENDICION)"});
                    }else{

                        //TODO: en lugar del bucle for, el método map crea un array de promesas, donde cada promesa representa 
                        //TODO: una operación de actualización. Luego, utilizamos Promise.all para ejecutar todas estas promesas en paralelo. 
                        //TODO: Esto debería ayudar a mejorar el rendimiento en comparación con la ejecución secuencial.
                        
                        // Iterar por cada iddinero en el array
                        // for (const idproducto of idsProducto) {
                        
                        //     const cantidad = obj[idproducto];
                            
                        //     //obtien el monto del dinero y al mismo tiempo valida que se encuentre registrado
                        //     const producto = await Producto.findByPk(idproducto);
                        //     if (!producto) {
                        //             // throw new Error(`El producto con id ${idproducto} no existe`);
                        //             t.rollback();
                        //             res.status(409).send({msg:`El producto con id ${idproducto} no existe`});
                        //     }

                        //     const totalCierre = cantidad * producto.precio;
                            
                        //     // Actualizar el registro en DInventario correspondiente a este idproducto y este idcabecera
                        
                        //     await DInventario.update(
                        //         {
                        //             cantidadCierre: cantidad,
                        //             totalCierre: totalCierre,
                        //         },
                        //         {
                        //         where: {
                        //             idcabecera: idCabecera,
                        //             idproducto: idproducto,
                        //         },
                        //             transaction: t 
                        //         }
                        //     );
                        // }

                        // Iterar por cada idproducto en el array
                        const actualizacionesProductos = idsProducto.map(async (idproducto) => {
                            const cantidad = obj[idproducto];

                            const producto = await Producto.findByPk(idproducto);
                            
                            if (!producto) {
                                throw new Error(`El producto con id ${idproducto} no existe`);
                                // t.rollback();
                                // res.status(409).send({msg:`El producto con id ${idproducto} no existe`});
                            }

                            //! Recuperar el registro de DInventario correspondiente al producto y cabecera
                            const inventario = await DInventario.findOne({
                                where: { idproducto: idproducto, idcabecera: idCabecera },
                                transaction: t
                            });
                            
                            //! Recuperar el registro de DInventario correspondiente al producto y cabecera
                            if (!inventario) {
                                // throw new Error(`No se encontró un registro en DInventario para el producto con id ${idProducto} y la cabecera con id ${idCabecera}`);
                                t.rollback();
                                res.status(409).send({msg:`El producto con id ${idproducto} no encontrado`});
                            }
                            
                            //! Recuperar el registro de DInventario correspondiente al producto y cabecera
                            //  const totalCierre = cantidad * producto.precio;
                            const totalCierre = cantidad * inventario.dataValues.precio;

                            return DInventario.update(
                                {
                                    cantidadCierre: cantidad,
                                    totalCierre: totalCierre,
                                },
                                {
                                    where: {
                                        idcabecera: idCabecera,
                                        idproducto: idproducto,
                                    },
                                    transaction: t,
                                }
                            );
                        });

                        // Ejecutar las consultas de búsqueda y actualización en paralelo
                        await Promise.all(actualizacionesProductos);

                        //TODO:para evitar consultar todos los registros    
                        //si el detalle de rendicion ya se ha cerrado, el cierre se colcluye
                        // if(detalleR[0].cantidadCierre!==null){
                        const datosR=detalleR.dataValues;
                        if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                            await CInventario.update({ estado: 'CC', fechaCierre:fechaTiempoHoy }, { where: { idCabecera: idCabecera }, transaction: t });
                        }else{//si el detalle de rendicion aun no se ha cerrado, el cierre es inicial
                            await CInventario.update({ estado: 'CI' }, { where: { idCabecera: idCabecera }, transaction: t });
                            console.log('actualizar a CI')
                        }
                        
                        // //consulta solo para el response
                        // const detalles = await DInventario.findAll({ 
                        //     where: {
                        //         idcabecera: idCabecera
                        //     }
                        // });
                        
                        await t.commit();
                        
                        res.status(200).send({msg:"Detalle de inventario registrado correctamente"});
                    }
                }

            }else{//apertura del detalle de inventario de productos

                const data = idsProducto.map(async (idproducto) => {
                    const cantidad = obj[idproducto];
                    
                    //obtien el monto del dinero y al mismo tiempo valida que se encuentre registrado
                    const producto = await Producto.findByPk(idproducto);
              
                    if (!producto) {
                      throw new Error(`El producto con id ${idproducto} no existe`);
                        // t.rollback();
                        // res.status(409).send({msg:`El producto con id ${idproducto} no existe`});
                    }
              
                    return {
                        idcabecera: idCabecera, 
                        idusuario: idUsuario,
                        idproducto: idproducto,
                        cantidadApertura: cantidad,
                        precio:producto.precio,
                       // cantidadCierre:0, --> se usa para verificar habilitacion
                       
                       //TODO:PROBANDO COBROS POR CREDITOS
                    //    cantidadRecepcion:0,
                    //    cantidadSalida:0,    
                    
                        totalApertura: cantidad * producto.precio,
                    };
                });

                const detalles = await DInventario.bulkCreate(await Promise.all(data), {
                   transaction: t,
                });
                
                //TODO:para evitar consultar todos los registros 
                // const detalleR = await DRendicion.findAll({
                    //     where: {
                        //         idcabecera: idCabecera
                        //     }
                        // });
                const detalleR = await DRendicion.findOne({
                    where: {
                        idcabecera: idCabecera
                    }
                });
                        
                //TODO:para evitar consultar todos los registros 
                //verificar si ya existe una apertura de inventario la apertura se completa, si es que no la apertura es inicial
                // if(detalleR.length!==0){
                if(detalleR){
                    await CInventario.update({ estado: 'AC' }, { where: { idCabecera: idCabecera }, transaction: t });
                }else{
                    await CInventario.update({ estado: 'AI' }, { where: { idCabecera: idCabecera }, transaction: t });
                }
              
                await t.commit();

                res.status(200).send({msg:"Detalle de inventario registrado correctamente"});

            }
        }else{//no existe la cabecera de inventario
            res.status(500).send({msg:"No existe ninguna apertura"});
        }


    } catch (error) {
      if (t) await t.rollback(); // Verificar que t esté definido antes de llamar a rollback()
      console.log(error);
      res.status(500).json({msg:'Error al realizar la transacción'});
    }
  };
// const registrarInventario = async (req, res = response) => { 
//     let t; //para generar la transaccion
//     try {
//         const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
//         const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
//         // Obtener la fecha actual según la zona horaria de Paraguay
//         const fechaActual = moment().tz(zonaHorariaParaguay);
//         // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
//         // const fechaHoy = fechaActual.format('YYYY-MM-DD');
//         const fechaHoy = fechaActual.format('YYYY-MM-DD');
//         const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

//         const idUsuario=req.usuario.idUsuario;

//         const obj = req.body.productos; //recibe un objeto q contiene todos los id's de productos y su cantidad
//         const idsProducto = Object.keys(obj); //las llaves del objeto corresponden a los id's de cada producto
        
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

//         //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de inventario
        
//         if(cabecera.length > 0){//ya existe la cabecera de inventario

//             //COMIENZA LA TRANSACCION
//             t = await sequelize.transaction();

//             const idCabecera=cabecera[0].dataValues.idCabecera;
            
//             //TODO:para evitar consultar todos los registros 
//             // const detalleI = await DInventario.findAll({
//             //     where: {
//             //         idcabecera: idCabecera,
//             //     }
//             // });
 
//             const detalleI = await DInventario.findOne({
//                 where: {
//                     idcabecera: idCabecera,
//                 }
//             });

//             //TODO:para evitar consultar todos los registros 
//             //si la cantidad de registros es mayor a 0 ya se realizo una apertura del detalle de inventario de productos
//             // if(detalleI.length > 0){//Actualizar registros si ya existe una apertura en el detalle de inventario
//             if(detalleI){//Actualizar registros si ya existe una apertura en el detalle de inventario
                 
//                 //si ya hay un detalle de inventario este puede o no estar cerrado (si ya existe un total cierre en uno de sus registros, ya esta cerrada)
             
//                 //TODO:para evitar consultar todos los registros 
//                 //  if(detalleI[0].cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
//                 const datosI=detalleI.dataValues;
//                 if(datosI.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
//                     throw new Error(`El inventario del turno ya se encuentra cerrada`);
//                     // t.rollback();
//                     // res.status(409).send({msg:"El inventario del turno ya se encuentra cerrada"});
//                 }else{//el inventario aun no se encuentra cerrada - cierre del detalle de inventario de productos
//                     //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de rendicion)
                    
//                     //TODO:para evitar consultar todos los registros 
//                     // const detalleR = await DRendicion.findAll({
//                     //     where: {
//                     //         idcabecera: idCabecera,
//                     //     }
//                     // });
//                     const detalleR = await DRendicion.findOne({
//                         where: {
//                             idcabecera: idCabecera,
//                         }
//                     });

//                     //TODO:para evitar consultar todos los registros 
//                     // if(detalleR.length>0){
//                     if(!detalleR){
//                         throw new Error(`La apertura debe estar finalizada (FALTA RENDICION)`); 
//                         // t.rollback();
//                         // res.status(409).send({msg:"La apertura debe estar finalizada (FALTA RENDICION)"});
//                     }else{

//                         //TODO: en lugar del bucle for, el método map crea un array de promesas, donde cada promesa representa 
//                         //TODO: una operación de actualización. Luego, utilizamos Promise.all para ejecutar todas estas promesas en paralelo. 
//                         //TODO: Esto debería ayudar a mejorar el rendimiento en comparación con la ejecución secuencial.
                        
//                         // Iterar por cada iddinero en el array
//                         // for (const idproducto of idsProducto) {
                        
//                         //     const cantidad = obj[idproducto];
                            
//                         //     //obtien el monto del dinero y al mismo tiempo valida que se encuentre registrado
//                         //     const producto = await Producto.findByPk(idproducto);
//                         //     if (!producto) {
//                         //             // throw new Error(`El producto con id ${idproducto} no existe`);
//                         //             t.rollback();
//                         //             res.status(409).send({msg:`El producto con id ${idproducto} no existe`});
//                         //     }

//                         //     const totalCierre = cantidad * producto.precio;
                            
//                         //     // Actualizar el registro en DInventario correspondiente a este idproducto y este idcabecera
                        
//                         //     await DInventario.update(
//                         //         {
//                         //             cantidadCierre: cantidad,
//                         //             totalCierre: totalCierre,
//                         //         },
//                         //         {
//                         //         where: {
//                         //             idcabecera: idCabecera,
//                         //             idproducto: idproducto,
//                         //         },
//                         //             transaction: t 
//                         //         }
//                         //     );
//                         // }

//                         // Iterar por cada idproducto en el array
//                         const actualizacionesProductos = idsProducto.map(async (idproducto) => {
//                             const cantidad = obj[idproducto];

//                             const producto = await Producto.findByPk(idproducto);

//                             if (!producto) {
//                                 throw new Error(`El producto con id ${idproducto} no existe`);
//                                 // t.rollback();
//                                 // res.status(409).send({msg:`El producto con id ${idproducto} no existe`});
//                             }

//                             const totalCierre = cantidad * producto.precio;

//                             return DInventario.update(
//                                 {
//                                     cantidadCierre: cantidad,
//                                     totalCierre: totalCierre,
//                                 },
//                                 {
//                                     where: {
//                                         idcabecera: idCabecera,
//                                         idproducto: idproducto,
//                                     },
//                                     transaction: t,
//                                 }
//                             );
//                         });

//                         // Ejecutar las consultas de búsqueda y actualización en paralelo
//                         await Promise.all(actualizacionesProductos);

//                         //TODO:para evitar consultar todos los registros    
//                         //si el detalle de rendicion ya se ha cerrado, el cierre se colcluye
//                         // if(detalleR[0].cantidadCierre!==null){
//                         const datosR=detalleR.dataValues;
//                         if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
//                             await CInventario.update({ estado: 'CC', fechaCierre:fechaTiempoHoy }, { where: { idCabecera: idCabecera }, transaction: t });
//                         }else{//si el detalle de rendicion aun no se ha cerrado, el cierre es inicial
//                             await CInventario.update({ estado: 'CI' }, { where: { idCabecera: idCabecera }, transaction: t });
//                             console.log('actualizar a CI')
//                         }
                        
//                         // //consulta solo para el response
//                         // const detalles = await DInventario.findAll({ 
//                         //     where: {
//                         //         idcabecera: idCabecera
//                         //     }
//                         // });
                        
//                         await t.commit();
                        
//                         res.status(200).send({msg:"Detalle de inventario registrado correctamente"});
//                     }
//                 }

//             }else{//apertura del detalle de inventario de productos

//                 const data = idsProducto.map(async (idproducto) => {
//                     const cantidad = obj[idproducto];
                    
//                     //obtien el monto del dinero y al mismo tiempo valida que se encuentre registrado
//                     const producto = await Producto.findByPk(idproducto);
              
//                     if (!producto) {
//                       throw new Error(`El producto con id ${idproducto} no existe`);
//                         // t.rollback();
//                         // res.status(409).send({msg:`El producto con id ${idproducto} no existe`});
//                     }
              
//                     return {
//                         idcabecera: idCabecera, 
//                         idusuario: idUsuario,
//                         idproducto: idproducto,
//                         cantidadApertura: cantidad,
//                         precio:producto.precio,
//                        // cantidadCierre:0, --> se usa para verificar habilitacion
                       
//                        //TODO:PROBANDO COBROS POR CREDITOS
//                     //    cantidadRecepcion:0,
//                     //    cantidadSalida:0,    
                    
//                         totalApertura: cantidad * producto.precio,
//                     };
//                 });

//                 const detalles = await DInventario.bulkCreate(await Promise.all(data), {
//                    transaction: t,
//                 });
                
//                 //TODO:para evitar consultar todos los registros 
//                 // const detalleR = await DRendicion.findAll({
//                     //     where: {
//                         //         idcabecera: idCabecera
//                         //     }
//                         // });
//                 const detalleR = await DRendicion.findOne({
//                     where: {
//                         idcabecera: idCabecera
//                     }
//                 });
                        
//                 //TODO:para evitar consultar todos los registros 
//                 //verificar si ya existe una apertura de inventario la apertura se completa, si es que no la apertura es inicial
//                 // if(detalleR.length!==0){
//                 if(detalleR){
//                     await CInventario.update({ estado: 'AC' }, { where: { idCabecera: idCabecera }, transaction: t });
//                 }else{
//                     await CInventario.update({ estado: 'AI' }, { where: { idCabecera: idCabecera }, transaction: t });
//                 }
              
//                 await t.commit();

//                 res.status(200).send({msg:"Detalle de inventario registrado correctamente"});

//             }
//         }else{//no existe la cabecera de inventario
//             res.status(500).send({msg:"No existe ninguna apertura"});
//         }


//     } catch (error) {
//       if (t) await t.rollback(); // Verificar que t esté definido antes de llamar a rollback()
//       console.log(error);
//       res.status(500).json({msg:'Error al realizar la transacción'});
//     }
//   };

  //FIXME:
const verificarRendicion = async (req, res = response) => {  // verificar que la rendicion de caja este disponible
    try {
        const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
        
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
    
        //para el response
        let habilitar=false;
        let descripcion='';

        //verificamos que ya exista una cabecera(apertura) del inventario el dia de hoy con mi sucursal y mi turno
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

        //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de rendicion de caja
        
        if(cabecera.length > 0){//ya existe una cabecera de inventario            
 
            const idCabecera=cabecera[0].dataValues.idCabecera;
            const fechaApertura=cabecera[0].dataValues.fechaApertura;
            
            //TODO:para evitar consultar todos los registros 
            // const detalleR = await Drendicion.findAll({
            //     where: {
            //         idcabecera: idCabecera,
            //     }
            // });

            const detalleR = await Drendicion.findOne({
                where: {
                    idcabecera: idCabecera,
                }
            });

            //TODO:para evitar consultar todos los registros 
            // if(detalleR.length>0){//si la cantidad de registros es mayor a 0 ya se realizo una apertura del detalle de rendicion (apertura realizada)
            if(detalleR){//si la cantidad de registros es mayor a 0 ya se realizo una apertura del detalle de rendicion (apertura realizada)
 
                 //si ya hay una apertura esta puede o no estar cerrada (si ya existe un total cierre en uno de sus registros, ya esta cerrada)
                
                 //TODO:para evitar consultar todos los registros 
                //  if(detalleR[0].cantidadCierre!==null){//ya se encuentra cerrada - la rendicion caja se ha completado
                const datosR=detalleR.dataValues;
                if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - la rendicion caja se ha completado
                    habilitar=false;
                    descripcion='La detalle de rendicion del turno ya se encuentra cerrada'
                 }else{//la rendicion aun no se encuentra cerrada 
                    //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de inventario)
                    
                    //TODO:para evitar consultar todos los registros 
                    // const detalleI = await DInventario.findAll({
                    //     where: {
                    //         idcabecera: idCabecera,
                    //     }
                    // });

                    const detalleI = await DInventario.findOne({
                        where: {
                            idcabecera: idCabecera,
                        }
                    });

                    // if(detalleI.length>0){
                    if(detalleI){
                        habilitar=true;//ya existe una apetura de inventario - se pude realizar el cierre de rendicion
                        descripcion='Cierre de caja'
                    }else{
                        habilitar=false;//aun no se realizo una apertura de inventario - no se puede realizar el cierre
                        descripcion='La apertura del detalle de inventario se encuentra pendiente'
                    }
                }
                         
                res.status(200).send({habilitado:habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera});    
            }else{//NO EXISTE DETALLE DE CAJA PERO YA HAY UNA APERTURA EN CABECERA -entonces es una apertura de caja  
                res.status(200).json({habilitado:true, descripcion:'Apertura de caja', fechaApertura, idCabeceraInv:idCabecera});
            }
        }else{
            res.status(200).json({habilitado:false, descripcion:'No existe ninguna apertura'});

        }
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al verificar el detalle de rendicion'});
    }
}

//FIXME:
// const dinerosRendicion = async (req, res = response) => {  // verificar que la rendicion de caja este disponible
//     try {
//         const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
//         const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
        
//         // Obtener la fecha actual según la zona horaria de Paraguay
//         const fechaActual = moment().tz(zonaHorariaParaguay);
//         // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
//         const fechaHoy = fechaActual.format('YYYY-MM-DD');
    
//         //para el response
//         let habilitar=false;
//         let descripcion='';

//         //verificamos que ya exista una cabecera(apertura) del inventario el dia de hoy con mi sucursal y mi turno
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

//         //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de rendicion de caja
        
//         if(cabecera.length > 0){//ya existe una cabecera de inventario            
 
//             const idCabecera=cabecera[0].dataValues.idCabecera;
            
//             //TODO:para evitar consultar todos los registros 
//             // const detalleR = await Drendicion.findAll({
//             //     where: {
//             //         idcabecera: idCabecera,
//             //     }
//             // });

//             const detalleR = await Drendicion.findOne({
//                 where: {
//                     idcabecera: idCabecera,
//                 }
//             });

//             //TODO:para evitar consultar todos los registros 
//             // if(detalleR.length>0){//si la cantidad de registros es mayor a 0 ya se realizo una apertura del detalle de rendicion (apertura realizada)
//             if(detalleR){//si la cantidad de registros es mayor a 0 ya se realizo una apertura del detalle de rendicion (apertura realizada)
 
//                  //si ya hay una apertura esta puede o no estar cerrada (si ya existe un total cierre en uno de sus registros, ya esta cerrada)
                
//                  //TODO:para evitar consultar todos los registros 
//                 //  if(detalleR[0].cantidadCierre!==null){//ya se encuentra cerrada - la rendicion caja se ha completado
//                 const datosR=detalleR.dataValues;
//                 if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - la rendicion caja se ha completado
//                     habilitar=false;
//                     descripcion='La detalle de rendicion del turno ya se encuentra cerrada'
//                  }else{//la rendicion aun no se encuentra cerrada 
//                     //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de inventario)
                    
//                     //TODO:para evitar consultar todos los registros 
//                     // const detalleI = await DInventario.findAll({
//                     //     where: {
//                     //         idcabecera: idCabecera,
//                     //     }
//                     // });

//                     const detalleI = await DInventario.findOne({
//                         where: {
//                             idcabecera: idCabecera,
//                         }
//                     });

//                     // if(detalleI.length>0){
//                     if(detalleI){
//                         const [total, dinero] = await Promise.all([
//                             Dinero.count({ where: { estado: true } }),
//                             Dinero.findAll({
//                             where: { estado: true },
//                             order: [['monto', 'ASC']] // Ordenar por el campo 'monto' en orden ascendente
//                             })
//                         ]);
                    
//                         res.json({
//                             total,
//                             dinero
//                         });
//                     }else{
//                         res.status(500).json({msg:'La apertura del detalle de inventario se encuentra pendiente'});
//                     }
//                 }
                         
//             }else{//NO EXISTE DETALLE DE CAJA PERO YA HAY UNA APERTURA EN CABECERA -entonces es una apertura de caja  
//                 const [total, dinero] = await Promise.all([
//                     Dinero.count({ where: { estado: true, entrada:1 } }),
//                     Dinero.findAll({
//                     where: { estado: true, entrada:1 },
//                     order: [['monto', 'ASC']] // Ordenar por el campo 'monto' en orden ascendente
//                     })
//                 ]);
            
//                 res.json({
//                     total,
//                     dinero
//                 });
//             }
//         }else{
//             res.status(500).json({msg:'No existe ninguna apertura'});

//         }
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({msg:'Error al verificar el detalle de rendicion'});
//     }
// }

const dinerosRendicion = async (req = request, res = response)=> {

    try {
        const [total, dinero] = await Promise.all([
            Dinero.count({ where: { estado: true } }),
            Dinero.findAll({
              where: { estado: true },
            //   order: [['monto', 'ASC']] // Ordenar por el campo 'monto' en orden ascendente
            })
        ]);

        // console.log(dinero)
    
        res.json({
            total,
            dinero
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al obtener los dineros'});
    }
}

//FIXME:
const registrarRendicion = async (req, res = response) => { 
    
    let t; //para generar la transaccion
    try {
        const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
        const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

        const idUsuario=req.usuario.idUsuario;
        
        const dinerosControles = req.body.dineroControles; //recibe un objeto q contiene todos los id's de dineros y su cantidad
        //const idsDinero = Object.keys(obj); //las llaves del objeto corresponden a los id's de cada dinero
        
        let montoApertura=0;
        let montoCierre=0;
        let montoDiferencia=0;
        let montoPendiente=0;
        let montoOtrosCobros=0;
    
        const cabecera = await CInventario.findAll({
            where: {
                idsucursal: idSucursal,
                turno:turno,
                [Op.and]: sequelize.where(
                    sequelize.fn('DATE', sequelize.col('fechaApertura')),
                    fechaHoy
                )
            }
            
        });
        
        //si es que ya existe una cabecera obtenemos su id y buscamos en el detalle de rendicion de caja
        if(cabecera.length > 0){//ya existe la cabecera de inventario
            
            const cabeceraInventario=cabecera[0].dataValues;
            
            //COMIENZA LA TRANSACCION
            t = await sequelize.transaction();

            const idCabecera=cabecera[0].dataValues.idCabecera;
            
            //TODO:para evitar consultar todos los registros 
            // const detalleR = await DRendicion.findAll({ 
            //     where: {
            //         idcabecera: idCabecera
            //     }
            // });

            const detalleR = await DRendicion.findOne({ 
                where: {
                    idcabecera: idCabecera
                }
            });

            //TODO:para evitar consultar todos los registros 
            //si la cantidad de registros es mayor a 0 ya se realizo una apertura del detalle de rendicion de caja
            // if(detalleR.length >0){ //Actualizar registros si ya existe una apertura en el detalle de rendicion
            if(detalleR){ //Actualizar registros si ya existe una apertura en el detalle de rendicion

                //si ya hay una apertura esta puede o no estar cerrada (si ya existe un total cierre en uno de sus registros, ya esta cerrada)

                //TODO:para evitar consultar todos los registros 
                // if(detalleR[0].cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                const datosR=detalleR.dataValues;
                if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                    throw new Error(`La rendicion del turno ya se encuentra cerrada`); 

                    // t.rollback();
                    // res.status(500).send({msg:"La rendicion del turno ya se encuentra cerrada"});
                }else{
                    //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de inventario)
                    
                    //TODO:para evitar consultar todos los registros 
                    // const detalleI = await DInventario.findAll({
                    //     where: {
                    //         idcabecera: idCabecera

                    //     }
                    // });  
                    
                    const detalleI = await DInventario.findOne({
                        where: {
                            idcabecera: idCabecera

                        }
                    });    

                    //TODO:para evitar consultar todos los registros 
                    //para cerrar el detalle de inventario de productos es necesarios que el detalle de caja ya tenga una apertura
                    // if(detalleI.length===0){//no se puede realizar un cierre sin completar la apertura
                    if(!detalleI){//no se puede realizar un cierre sin completar la apertura
                        throw new Error(`La apertura debe estar finalizada (FALTA INVENTARIO)`); 
                        // t.rollback();
                        // res.status(409).send({msg:"La apertura debe estar finalizada (FALTA INVENTARIO)"});
                    }else{ //se puede realizar el cierre ya que la apertura ya se ha completado

                        //TODO: en lugar del bucle for, el método map crea un array de promesas, donde cada promesa representa 
                        //TODO: una operación de actualización. Luego, utilizamos Promise.all para ejecutar todas estas promesas en paralelo. 
                        //TODO: Esto debería ayudar a mejorar el rendimiento en comparación con la ejecución secuencial.
                        
                        // Iterar por cada iddinero en el array
                        // for (const din of dinerosControles) {
                        
                        //     const cantidad = din.cantidad;
                        //     const iddinero=din.idBillete;
                        //     //const monto=din.monto -->para monto editable
                            
                        //     //obtien el monto del dinero y al mismo tiempo valida que se encuentre registrado
                        //     const dinero = await Dinero.findByPk(iddinero);
                        //     if (!dinero) {
                        //             //if (t) await t.rollback(); // Verificar que t esté definido antes de llamar a rollback()
                        //             throw new Error(`El Dinero con id ${iddinero} no existe`);
                        //     }
                            
                        //     //const totalCierre = cantidad * monto; --> para monto editable
                        //     const totalCierre = cantidad * dinero.monto;
    
    
                        //     //add para monto total
                        //     montoCierre+=totalCierre;
                        //     ///fin add
                            
                        //     // Actualizar el registro en DRendicion correspondiente a este iddinero y esta idcabecera
                            
                        //     await DRendicion.update({ cantidadCierre: cantidad, totalCierre: totalCierre,},
                        //         {
                        //         where: {
                        //             idcabecera: idCabecera,
                        //             iddinero: iddinero,
                        //         },
                        //         transaction: t 
                        //         }
                        //     );
                        // }

                        const actualizacionesDineros = dinerosControles.map(async (din) => {
                            const cantidad = din.cantidad;
                            const iddinero = din.idBillete;
                      
                            const dinero = await Dinero.findByPk(iddinero);
                            if (!dinero) {
                                throw new Error(`El Dinero con id ${iddinero} no existe`);
                                // t.rollback();
                                // res.status(409).send({msg:`El dinero con id ${iddinero} no existe`});
                            }
                      
                            
                            const totalCierre = cantidad * dinero.monto;
                      
                            //TODO:PROBANDO COBROS POR CREDITOS
                            // if(dinero.entrada===true){
                            //     montoCierre += totalCierre;
                            // }else{
                            //     montoPendiente += totalCierre;
                            // }

                            if(dinero.entrada===1){//dinero cobrado por la venta de productos
                                montoCierre += totalCierre;
                            }else if(dinero.entrada===0 || dinero.entrada===3){//dinero no presente por dar creditos, por cobrar con tarjetas o por pagar por compras de productos
                                montoPendiente += totalCierre;
                            }else if(dinero.entrada===2){//cobros por creditos dados en dias anteriores
                                montoOtrosCobros += totalCierre;
                            }
                            ///
                            return DRendicion.update(
                              { cantidadCierre: cantidad, totalCierre: totalCierre },
                              {
                                where: {
                                  idcabecera: idCabecera,
                                  iddinero: iddinero
                                },
                                transaction: t
                              }
                            );
                        });
                      
                        // Ejecutar todas las actualizaciones en paralelo usando Promise.all
                        await Promise.all(actualizacionesDineros);
                          
                        //add para monto total
                        montoDiferencia=montoCierre-cabeceraInventario.montoApertura;
                        ///fin add
                        
                        //TODO:para evitar consultar todos los registros    
                        // if(detalleI[0].cantidadCierre!==null){
                        const datosI=detalleI.dataValues;
                        if(datosI.cantidadCierre!==null){  
                            //TODO:PROBANDO COBROS POR CREDITOS                          
                            // await CInventario.update({ estado: 'CC', montoCierre, montoDiferencia, montoPendiente: montoPendiente, fechaCierre:fechaTiempoHoy }, { where: { idCabecera: idCabecera }, transaction: t });
                            await CInventario.update({ estado: 'CC', montoCierre, montoDiferencia, montoPendiente: montoPendiente, montoOtrosCobros: montoOtrosCobros, fechaCierre:fechaTiempoHoy }, { where: { idCabecera: idCabecera }, transaction: t });
                        }else{
                            //TODO:PROBANDO COBROS POR CREDITOS                          
                            // await CInventario.update({ estado: 'CI', montoCierre, montoDiferencia, montoPendiente }, { where: { idCabecera: idCabecera }, transaction: t });
                            await CInventario.update({ estado: 'CI', montoCierre, montoDiferencia, montoPendiente:montoPendiente, montoOtrosCobros: montoOtrosCobros }, { where: { idCabecera: idCabecera }, transaction: t });
                        }
                        
                        
                        //solo agrego para retornar los nuevos datos
                        // const detalles = await DRendicion.findAll({ 
                        //     where: {
                        //         idcabecera: idCabecera
                        //     }
                        // });
                        
                        await t.commit();
                        
                        res.status(200).send({msg:"Detalle de rendicion registrado correctamente"});
                    }
                }

            }else{//apertura del detalle de rendicion de caja


                const data = dinerosControles.map(async (din)=>{
                    const cantidad = din.cantidad;
                    const idbillete=din.idBillete;
                   // const monto=din.monto
                  //obtien el monto del dinero y al mismo tiempo valida que se encuentre registrado

                    const dinero = await Dinero.findByPk(idbillete);
              
                    if (!dinero) {
                      throw new Error(`El Dinero con id ${idbillete} no existe`);
                        // t.rollback();
                        // res.status(409).send({msg:`El dinero con id ${idbillete} no existe`});
                    }

                    //const totalCierre = cantidad * monto; --> para monto editable
                    const totalApertura = cantidad * dinero.monto;

                    //add para monto total
                    //TODO:PROBANDO COBROS POR CREDITOS

                    // if(dinero.entrada===true){
                    //     montoApertura += totalApertura
                    // }
                    if(dinero.entrada===1){
                        montoApertura += totalApertura
                    }
                    ///fin add
              
                    return {
                      idcabecera: idCabecera, 
                      idusuario:idUsuario,
                      iddinero: idbillete,
                      cantidadApertura: cantidad,
                      totalApertura: totalApertura,
                    };
                });
              
                const detalles = await DRendicion.bulkCreate(await Promise.all(data), {
                   transaction: t,
                });

                //TODO:para evitar consultar todos los registros 
                // const detalleI = await DInventario.findAll({
                //     where: {
                //         idcabecera: idCabecera
                //     }
                // });
                const detalleI = await DInventario.findOne({
                    where: {
                        idcabecera: idCabecera
                    }
                });

                //TODO:para evitar consultar todos los registros 
                //verificar si ya existe una apertura de inventario la apertura se completa, si es que no la apertura es inicial
                // if(detalleI.length!==0){
                if(detalleI){
                    await CInventario.update({ estado: 'AC', montoApertura }, { where: { idCabecera: idCabecera }, transaction: t });
                }else{
                    await CInventario.update({ estado: 'AI', montoApertura }, { where: { idCabecera: idCabecera }, transaction: t });
                }
              
                await t.commit();
            
                res.status(200).send({msg:"Detalle de rendicion registrado correctamente"});
            
            }
        }else{
            res.status(500).send({msg:"No existe ninguna apertura"});
        }


    } catch (error) {
      if (t) await t.rollback(); // Verificar que t esté definido antes de llamar a rollback()
      console.log(error);
      res.status(500).json({msg:'Error al realizar la transacción'});
    } 
};

  
//TODO: Para probar el serverside de angular datatable
// const cabecerasIGetServer =  async (req, res) => {
//     try {
//         console.log('req.query', req.query)

//         const draw = parseInt(req.query.draw) || 1;
//         const start = parseInt(req.query.start) || 0;
//         const length = parseInt(req.query.length) || 10;
        
  
//       // Obtener los datos de clasificación utilizando el modelo
//       const cabeceras = await CInventario.findAndCountAll({
//         offset: start,
//         limit: length,
//         include: [{ model: Usuario, attributes:[ 'nombre'] }, { model: Sucursal, attributes:[ 'nombre'] }] // Incluir el modelo de Usuario en la consulta
//       });
  
//       const dataTablesResponse = {
//         draw: draw,
//         recordsTotal: cabeceras.count,
//         recordsFiltered: cabeceras.count,
//         data: cabeceras.rows
//       };
  
//       res.json(dataTablesResponse);
//     } catch (error) {
//       console.error('Error al obtener las cabeceras', error);
//       res.status(500).json({ error: 'Error al obtener las cabeceras' });
//     }
// }


const visualizarInventario = async (req, res = response) => { 
    try {
        const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal

        const turno=req.usuario.turno; //para obtner la cabecera de esta sucursal

        const idusuario=req.usuario.idUsuario

        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
                
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

            const idCabecera=cabecera[0].dataValues.idCabecera;

            const dInventario = await DInventario.findAll({
                where: {
                    idcabecera:idCabecera
                },
                include: [
                    // {
                    //     model: CInventario,
                    //     where: { idcabinventario: idCabecera },
                    //     include: [],
                    // },
                    {
                        model: Producto,
                        include: [],
                        attributes:['nombre']
                    },
                ],
            });

            res.json({
                dInventario
            });


        }else{
            res.status(500).send({msg:"No existe ninguna apertura"});
        }

    } catch (error) {
      res.status(500).json({msg:'Error al realizar la transacción'});
    }
  };

module.exports = {

    verExisteApertura,
    sucDeUsurio,
    crearApertura,
    
    verificarInventario,
    productosInventario,
    registrarInventario,

    verificarRendicion,
    dinerosRendicion,
    registrarRendicion,

    obtenerProductoPorId,

    visualizarInventario

}
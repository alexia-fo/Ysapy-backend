//!FUNCIONARIO

const { response } = require("express");
//Para transacciones
const sequelize = require('../db/conections');
//Para operador AND, OR, etc..
const { Op } = require('sequelize');
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';
const {CInventario, Dinero, DInventario, Drendicion, Producto, Sucursal, Clasificacion} = require('../model');
const DRendicion = require("../model/dRendicion");

//FIXME: para recepciones y salidas, buscar producto cuando se desenfoca en el campo idProducto
const obtenerProductoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        //solo se obtiene los productos que son activos y facturables com
        const producto = await Producto.findOne({
            where: { idProducto: id, activo:1, facturable:1 },
            attributes: ['nombre'] // Especifica el nombre como el único atributo a recuperar
        });
        // Si el producto no se encuentra, devuelve un error 404
        if (!producto) {
            return res.status(404).json({ msg: "Producto no encontrado o inactivo" });
        }

        // Si el producto se encuentra, devuélvelo en la respuesta
        res.status(200).json(producto);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Error al obtener el producto" });
    }
};


//FIXME: para verificar si se puede realizar una apertura en la cabecera de inventario
//retorna {habilitado:habilitar, descripcion, fechaApertura?, idCabeceraInv?}
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
            descripcion='Ya existe una apertura en este turno y sucusal..';
                                      
            res.status(200).send({habilitado:habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera});    

        }else{//No existe la cabecera
            habilitar=true;
            descripcion='La apertura del dia esta disponible..';
            res.status(200).send({habilitado:habilitar, descripcion});             
        }

 
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al verificar disponibilidad de inventario'});
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

        //en este punto ya se verficó si la apertura se encuentra disponible

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

        res.status(201).json({msg:'Apertura de inventario registrada correctamente'});

    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al realizar la aperura de inventario'});      
    }
}

//FIXME: verificar que el detalle de inventario de productos esté disponible/habilitado
const verificarInventario = async (req, res = response) => { 

    try {

        const idSucursal = req.usuario.idsucursal;
        const turno = req.usuario.turno; 
        
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
        
        //para el response        
        let habilitar=false;
        let descripcion='';
    
        //verificamos que ya exista una cabecera del inventario, del dia en la sucursal y turno del usuario
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
 
            const detalleI = await DInventario.findOne({
                where: {
                    idcabecera: idCabecera,
                }
            });

            if(detalleI){//si la cantidad de registros es mayor a 0 ya existe un detalle de inventario de productos (apertura realizada)
                 
                //si ya hay un detalle de inventario este puede o no estar cerrado (si ya existe un total cierre en uno de sus registros, ya esta cerrada)
             
                const datosI=detalleI.dataValues;
                if(datosI.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                    habilitar=false;
                    descripcion='El detalle de inventario ya se encuentra cerrada en su turno y sucusal'
                // }else{
                //     habilitar=true;
                //     descripcion='Registrar inventario'
                // }
                //TODO ULTIMA MODIFICACION
                }else{//el inventario aun no se encuentra cerrada 
                    //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de rendicion)
                    
                    const detalleR = await DRendicion.findOne({
                        where: {
                            idcabecera: idCabecera,
                        }
                    });

                    if(detalleR){
                        habilitar=true;//ya existe una apetura de rendicion - se pude realizar el cierre de inventario
                        descripcion='Cierre del detalle de inventario'
                    }else{
                        habilitar=false;//aun no se realizo una apertura de rendicion - no se puede realizar el cierre
                        descripcion='La apertura de detalle de la rendicion aún se encuentra pendiente.. Registre la apertura de caja!!'
                    }
                 }
                         
                 res.status(200).send({habilitado:habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera});    
            }else{//NO EXISTE DETALLE DE INVENTARIO PERO YA HAY UNA APERTURA EN CABECERA -entonces es una apertura de inventario
                res.status(200).json({habilitado:true, descripcion:'Apertura del detalle de inventario de productos', fechaApertura, idCabeceraInv:idCabecera});
            }
        }else{//no existe una cabecera de inventario
            res.status(200).json({habilitado:false, descripcion:'Aún no se ha realizado la apertura'});
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al verificar disponibilidad del detalle de inventario'});
    }
}

//FIXME: listar los productos para registrar el detalle de inventario, listado de productos en la 
//ventana buscar de recepciones y en salidas
// const productosInventario = async (req = request, res = response)=> {
//     try {
//         const [total,producto] = await Promise.all([
//             Producto.count({where: {activo:true, facturable:1}}),
//             Producto.findAll({
//                 where: {activo:true, facturable:1}
//             })
//         ]);
        
//         res.json({
//             total,
//             producto
//         });
        
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({msg: 'Error al obtener el listado de productos'});
//     }
// }

const productosInventario = async (req = request, res = response)=> {
    try {
        const [total,producto] = await Promise.all([
            Producto.count({where: {activo:true, facturable:1}}),
            Producto.findAll({
                where: { activo: true, facturable: 1 },
                include: Clasificacion,
                order: [['nombre', 'ASC']],
                attributes: [
                    'idProducto',
                    'precio',
                    'descripcion',
                    // [sequelize.literal('CONCAT(Producto.nombre, " - ", Clasificacion.nombre)'), 'nombre']
                    // Agrega otros campos que necesites
                    [sequelize.literal('CONCAT(LEFT(Clasificacion.nombre, 3), " - ", Producto.nombre)'), 'nombre'],

                ],
            })
        ]);
        
        res.json({
            total,
            producto
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Error al obtener el listado de productos'});
    }
}

// const productosInventario = async (req = request, res = response) => {
//     try {
//         const productos = await Producto.findAll({
//             where: { activo: true, facturable: 1 },
//             include: Clasificacion,
//             order: [['nombre', 'ASC']],
//             attributes: [
//                 'idProducto',
//                 'precio',
//                 'descripcion',
//                 [sequelize.literal('CONCAT(Producto.nombre, " - ", Clasificacion.nombre)'), 'nombre']
//                 // Agrega otros campos que necesites
//             ],
//         });

//         res.json(productos);
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ msg: 'Error al obtener el listado de productos' });
//     }
// }

//FIXME: para registrar el detalle de inventario de productos
const registrarInventario = async (req, res = response) => { 
    let t; //para generar la transaccion
    try {
        const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        const turno=req.usuario.turno; //para obtner la cabecera de este turno
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
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
            
            const detalleI = await DInventario.findOne({
                where: {
                    idcabecera: idCabecera,
                }
            });

            if(detalleI){//Actualizar registros si ya existe una apertura en el detalle de inventario
                 
                //si ya hay un detalle de inventario este puede o no estar cerrado (si ya existe un total cierre en uno de sus registros, ya esta cerrada)
             
                const datosI=detalleI.dataValues;
                if(datosI.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                    throw new Error(`El inventario del turno ya se encuentra cerrada`);
                    // t.rollback();
                    // res.status(409).send({msg:"El inventario del turno ya se encuentra cerrada"});
                }else{//el inventario aun no se encuentra cerrada - es un cierre del detalle de inventario de productos
                    //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de rendicion)
                    
                    const detalleR = await DRendicion.findOne({
                        where: {
                            idcabecera: idCabecera,
                        }
                    });

                    //TODO: ULTIMA MOD
                    if(!detalleR){
                        throw new Error(`La apertura debe estar finalizada (FALTA APERTURA DE RENDICION)`); 
                    }else{

                        // Iterar por cada idproducto en el array
                        const actualizacionesProductos = idsProducto.map(async (idproducto) => {
                            const cantidad = obj[idproducto];

                            const producto = await Producto.findByPk(idproducto);
                            
                            if (!producto) {
                                throw new Error(`El producto con id ${idproducto} no existe`);
                                // t.rollback();
                                // res.status(409).send({msg:`El producto con id ${idproducto} no existe`});
                            }

                            /*TODO: Recuperar el registro de DInventario correspondiente al producto y cabecera */
                            //si un producto no se encuentra en el detalle de inventario apertura, el cierre no se podrá realizar
                            const inventario = await DInventario.findOne({
                                where: { idproducto: idproducto, idcabecera: idCabecera },
                                transaction: t
                            });
                            
                            if (!inventario) {
                                // throw new Error(`No se encontró un registro en DInventario para el producto con id ${idProducto} y la cabecera con id ${idCabecera}`);
                                t.rollback();
                                res.status(409).send({msg:`El producto con id ${idproducto} no encontrado`});
                            }
                            /*TODO: Para calcular el total de un producto se utiliza el precio utilizado al momento de la apertura no el del producto
                            Si el precio de un producto se actualiza luego de que sa haya registrado la apertura, este precio no se tendra en cuenta en el 
                            cierre del mismo, sino se utilizará el mismo precio que se utilizo al momento de la apertura
                            */
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

                        
                        
                            const datosR=detalleR.dataValues;
                            if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                                await CInventario.update({ estado: 'CC', fechaCierre:fechaTiempoHoy }, { where: { idCabecera: idCabecera }, transaction: t });
                            }else{//si el detalle de rendicion aun no se ha cerrado, el cierre es inicial
                                await CInventario.update({ estado: 'CI' }, { where: { idCabecera: idCabecera }, transaction: t });
                            }
                        
                        

                        // if(detalleR){//TODO ADD
                        //     const datosR=detalleR.dataValues;
                        //     if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                        //         await CInventario.update({ estado: 'CC', fechaCierre:fechaTiempoHoy }, { where: { idCabecera: idCabecera }, transaction: t });
                        //     }else{//si el detalle de rendicion aun no se ha cerrado, el cierre es inicial
                        //         await CInventario.update({ estado: 'CI' }, { where: { idCabecera: idCabecera }, transaction: t });
                        //     }
                        // }
                        await t.commit();
                        
                        res.status(200).send({msg:"Detalle de inventario registrado correctamente"});
                    }               //TODO: ULTIMA MOD

                }

            }else{//apertura del detalle de inventario de productos

                const data = idsProducto.map(async (idproducto) => {
                    const cantidad = obj[idproducto];
                    
                    //valida que se encuentre registrado
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
                       // cantidadCierre:0, --> se usa para verificar habilitacion (si es null aun no se ha completado)
                       //    cantidadRecepcion:0,
                       //    cantidadSalida:0,    
                        totalApertura: cantidad * producto.precio,
                    };
                });

                const detalles = await DInventario.bulkCreate(await Promise.all(data), {
                   transaction: t,
                });
                
                const detalleR = await DRendicion.findOne({
                    where: {
                        idcabecera: idCabecera
                    }
                });
                    
                
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

//FIXME: verificar que el detalle de rendicion de caja esté disponible/habilitado
const verificarRendicion = async (req, res = response) => {  // verificar que la rendicion de caja este disponible
    try {
        const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        const turno=req.usuario.turno; //para obtner la cabecera de este turno
        
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
    
        //para el response
        let habilitar=false;
        let descripcion='';

        //verificamos que ya exista una cabecera de inventario(apertura) el dia de hoy con mi sucursal y mi turno
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

            const detalleR = await Drendicion.findOne({
                where: {
                    idcabecera: idCabecera,
                }
            });

            if(detalleR){//si la cantidad de registros es mayor a 0 ya se realizo una apertura del detalle de rendicion (apertura realizada)
 
                 //si ya hay una apertura esta puede o no estar cerrada (si ya existe un total cierre en uno de sus registros, ya esta cerrada)
                
                const datosR=detalleR.dataValues;
                if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - la rendicion caja se ha completado
                    habilitar=false;
                    descripcion='El detalle de rendicion ya se encuentra cerrada en su turno y sucusal'
                // }else{
                //     habilitar=true;
                //     descripcion='Registrar rendicion'
                // }
                //TODO ULTIMA MODIFICACION

                     }else{//la rendicion aun no se encuentra cerrada 
                    //EL CIRRE SE PODRA REALIZAR SOLO SI LA APERTURA SE HA CONCLUIDO (ya existe una apertura de inventario)

                    const detalleI = await DInventario.findOne({
                        where: {
                            idcabecera: idCabecera,
                        }
                    });

                    if(detalleI){
                        habilitar=true;//ya existe una apetura de inventario - se pude realizar el cierre de rendicion
                        descripcion='Cierre de detalle de caja'
                    }else{
                        habilitar=false;//aun no se realizo una apertura de inventario - no se puede realizar el cierre
                        descripcion='La apertura de detalle del inventario aún se encuentra pendiente.. Registre la apertura de inventario!!'
                    }
                }
                         
                res.status(200).send({habilitado:habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera});    
            }else{//NO EXISTE DETALLE DE CAJA PERO YA HAY UNA APERTURA EN CABECERA -entonces es una apertura de caja  
                res.status(200).json({habilitado:true, descripcion:'Apertura de caja', fechaApertura, idCabeceraInv:idCabecera});
            }
        }else{
            res.status(200).json({habilitado:false, descripcion:'Aún no se ha realizado la apertura'});

        }
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al verificar la disponibilidad del detalle de rendicion'});
    }
}

//FIXME: listar los dineros para registrar el detalle de rendicion
const dinerosRendicion = async (req = request, res = response)=> {
    try {

        const [total, dinero] = await Promise.all([
            Dinero.count({ where: { estado: true } }),
            Dinero.findAll({
              where: { estado: true },
            //   order: [['monto', 'ASC']] // Ord
            //enar por el campo 'monto' en orden ascendente
            })
        ]);
 
        res.json({
            total,
            dinero
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al obtener los dineros'});
    }
}

//FIXME: para registrar el detalle de rendicion de dineros
const registrarRendicion = async (req, res = response) => { 
    let t; //para generar la transaccion
    try {
        const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal
        const turno=req.usuario.turno; //para obtner la cabecera de esta turno
        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');
        const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

        const idUsuario=req.usuario.idUsuario;
        
        const dinerosControles = req.body.dineroControles; //recibe un objeto q contiene todos los id's de dineros y su cantidad
        
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

            const detalleR = await DRendicion.findOne({ 
                where: {
                    idcabecera: idCabecera
                }
            });

            if(detalleR){ //Actualizar registros si ya existe una apertura en el detalle de rendicion

                //si ya hay una apertura esta puede o no estar cerrada (si ya existe un total cierre en uno de sus registros, ya esta cerrada)

                const datosR=detalleR.dataValues;
                if(datosR.cantidadCierre!==null){//ya se encuentra cerrada - el inventario se ha completado
                    throw new Error(`La rendicion del turno ya se encuentra cerrada`); 

                    // t.rollback();
                    // res.status(500).send({msg:"La rendicion del turno ya se encuentra cerrada"});
                }else{
                    
                    const detalleI = await DInventario.findOne({
                        where: {
                            idcabecera: idCabecera

                        }
                    });    

                    if(!detalleI){//no se puede realizar un cierre sin completar la apertura
                        throw new Error(`La apertura debe estar finalizada (FALTA APERTURA DE INVENTARIO)`); 
                    }else{ //se puede realizar el cierre ya que la apertura ya se ha completado

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

                            if(dinero.entrada===1){//dinero cobrado por la venta de productos
                                montoCierre += totalCierre;
                            }else if(dinero.entrada===0 || dinero.entrada===3){//dinero no presente por dar creditos, por cobrar con tarjetas o por pagar por compras de productos
                                montoPendiente += totalCierre;
                            }else if(dinero.entrada===2){//cobros por creditos dados en dias anteriores
                                montoOtrosCobros += totalCierre;
                            }
                            
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
                          
                        montoDiferencia=montoCierre-cabeceraInventario.montoApertura;

                        const datosI=detalleI.dataValues;

                        if(datosI.cantidadCierre!==null){ //si el detalle de inventario ya tuvo un cierre, el cierre de cabecera de inventario se completa
                            await CInventario.update({ estado: 'CC', montoCierre, montoDiferencia, montoPendiente: montoPendiente, montoOtrosCobros: montoOtrosCobros, fechaCierre:fechaTiempoHoy }, { where: { idCabecera: idCabecera }, transaction: t });
                        }else{//si el detalle de inventario aun no se ha cerrado, el cierre es inicial
                            await CInventario.update({ estado: 'CI', montoCierre, montoDiferencia, montoPendiente:montoPendiente, montoOtrosCobros: montoOtrosCobros }, { where: { idCabecera: idCabecera }, transaction: t });
                        }

                        // if(detalleR){//TODO ADD

                        //     if(datosI.cantidadCierre!==null){ //si el detalle de inventario ya tuvo un cierre, el cierre de cabecera de inventario se completa
                        //         await CInventario.update({ estado: 'CC', montoCierre, montoDiferencia, montoPendiente: montoPendiente, montoOtrosCobros: montoOtrosCobros, fechaCierre:fechaTiempoHoy }, { where: { idCabecera: idCabecera }, transaction: t });
                        //     }else{//si el detalle de inventario aun no se ha cerrado, el cierre es inicial
                        //         await CInventario.update({ estado: 'CI', montoCierre, montoDiferencia, montoPendiente:montoPendiente, montoOtrosCobros: montoOtrosCobros }, { where: { idCabecera: idCabecera }, transaction: t });
                        //     }
                        // }
                                        
                        await t.commit();
                        
                        res.status(200).send({msg:"Detalle de rendicion registrado correctamente"});
                    }
                }

            }else{//apertura del detalle de rendicion de caja


                const data = dinerosControles.map(async (din)=>{
                const cantidad = din.cantidad;
                const idbillete=din.idBillete;

                    //obtiene el monto del dinero y al mismo tiempo valida que se encuentre registrado
                    const dinero = await Dinero.findByPk(idbillete);
              
                    if (!dinero) {
                      throw new Error(`El Dinero con id ${idbillete} no existe`);
                        // t.rollback();
                        // res.status(409).send({msg:`El dinero con id ${idbillete} no existe`});
                    }

                    const totalApertura = cantidad * dinero.monto;

                    if(dinero.entrada===1){
                        montoApertura += totalApertura
                    }
              
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

                const detalleI = await DInventario.findOne({
                    where: {
                        idcabecera: idCabecera
                    }
                });

                //si ya existe una apertura del detalle de inventario, la apertura se ha completado en la cabecera
                if(detalleI){
                    await CInventario.update({ estado: 'AC', montoApertura }, { where: { idCabecera: idCabecera }, transaction: t });
                }else{//si no existe una apertura del detalle de inventario, la apertura es inicial en la cabecera
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

//FIXME:listar las cantidades de apertura y cierre de producto registrados por el usuario. POR AHORA DESHABILITADO
// const visualizarInventario = async (req, res = response) => { 
//     try {
//         const idSucursal= req.usuario.idsucursal; //para obtner la cabecera de esta sucursal

//         const turno=req.usuario.turno; //para obtner la cabecera de este turno

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

//             const idCabecera=cabecera[0].dataValues.idCabecera;

//             const dInventario = await DInventario.findAll({
//                 where: {
//                     idcabecera:idCabecera
//                 },
//                 include: [
//                     {
//                         model: Producto,
//                         include: [],
//                         attributes:['nombre']
//                     },
//                 ],
//             });

//             res.json({
//                 dInventario
//             });


//         }else{
//             res.status(500).send({msg:"No existe ninguna apertura"});
//         }

//     } catch (error) {
//       res.status(500).json({msg:'Error al realizar la transacción'});
//     }
//   };

module.exports = {
    obtenerProductoPorId,

    verExisteApertura,
    sucDeUsurio,
    crearApertura,
    
    verificarInventario,
    productosInventario,
    registrarInventario,

    verificarRendicion,
    dinerosRendicion,
    registrarRendicion,

    // visualizarInventario
}
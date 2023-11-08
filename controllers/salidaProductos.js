//! -- SOLO PARA SERVICIOS DE FUNICIONARIO (SALIDA DE PRODUCTOS)--
//////////EMPLEADO///////
const { response } = require("express");
const { Producto, CInventario, CRecepcion, DInventario } = require("../model");

const sequelize = require('../db/conections');
const { Op } = require('sequelize');
const DRecepcion = require("../model/dRecepcion");
const CSalida = require("../model/csalida");
const DSalida = require("../model/dSalida");
const Salida = require("../model/salida");
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const zonaHorariaParaguay = 'America/Asuncion';

//FIXME: para verificar si es posible registrar salidas
const verExisteApertura = async (req, res = response) => {
    try { 
    /*Existe una apertura en una sucursal, en un turno, en una fecha ?... el usuario no importa, cualquiera de los dos pueden generar*/
    
    const idSucursal= req.usuario.idsucursal; // para obtner la cabecera de esta sucursal
    const turno=req.usuario.turno;
    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('YYYY-MM-DD');

    let habilitar=false;
    let descripcion='';
    let fechaApertura = null; // Agrega esta variable para almacenar la fecha de apertura
    let idCabecera = null; // Agrega esta variable para almacenar el ID de la cabecera


    //verificamos que ya exista una cabecera del inventario
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
 
    if(cabecera.length > 0){
        idCabecera=cabecera[0].dataValues.idCabecera;
        fechaApertura = cabecera[0].dataValues.fechaApertura; // Obtenemos la fecha de apertura
        estado = cabecera[0].dataValues.estado; // si la cabecera ya se cerro no se puede registrar mas salida

        //verificamos que ya exista un detalle del inventario
        const detalle = await DInventario.findAll({
            where: {
                idcabecera: idCabecera,
            }
            
        });   
              
        if (detalle.length > 0) {
            if(!(estado==="CI" || estado==="CC" )){//si existe una apertura inicial o completada con tal que exista el detalle de inventario, la salida es posible
                habilitar = true;
                descripcion = 'El detalle de la apertura de inventario ya se ha registrado. Salida habilitada..';
            }else{//si ya existe un cierre inicial o final ya no se podra registrar salidas
                habilitar = false;
                descripcion = 'El inventario ya se ha cerrado..';
            }
        } else {
            habilitar = false;
            descripcion = 'El detalle de la apertura de inventario aún no se ha registrado';
        }         
    }else{//NO EXISTE APERTURA
        habilitar=false;
        descripcion='La apertura del dia esta pendiente..';
    }
                                                                        //null si no hay

    res.status(200).send({habilitado:habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera });             
 
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al verificar disponibilidad de inventario'});
    }
}

//FIXME: para habilitar la ventana que permite visualizar las salidas
const visualizacionDisponible = async (req, res = response) => {
    try { 
    /*Existe una apertura en una sucursal, en un turno, en una fecha ?... el usuario no importa, cualquiera de los dos pueden generar*/
    
    const idSucursal= req.usuario.idsucursal; // para obtner la cabecera de esta sucursal
    const turno=req.usuario.turno;
    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('YYYY-MM-DD');

    let habilitar=false;
    let descripcion='';
    let fechaApertura = null; // Agrega esta variable para almacenar la fecha de apertura
    let idCabecera = null; // Agrega esta variable para almacenar el ID de la cabecera


    //verificamos que ya exista una cabecera del inventario
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
 
    if(cabecera.length > 0){
        idCabecera=cabecera[0].dataValues.idCabecera;
        fechaApertura = cabecera[0].dataValues.fechaApertura; // Obtenemos la fecha de apertura
        estado = cabecera[0].dataValues.estado; // si la cabecera ya se cerro no se puede registrar mas salida

        //verificamos que ya exista un detalle del inventario
        const detalle = await DInventario.findAll({
            where: {
                idcabecera: idCabecera,
            }
            
        });   
        if(detalle.length > 0){
            habilitar=true;
            descripcion='EL detalle de la apertura de inventario ya se ha registrado..';     
        }else{
            habilitar=false;
            descripcion='El detalle de la apertura de inventario aún no se ha registrado. No existen salidas'
        }             
       
    }else{//NO EXISTE APERTURA
        habilitar=false;
        descripcion='La apertura del dia esta pendiente. No se han registrado salidas..';
    }
                                                                        //null si no hay

    res.status(200).send({habilitado:habilitar, descripcion, fechaApertura, idCabeceraInv:idCabecera });             
 
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al verificar disponibilidad de visualización'});
    }
}
//FIXME: registrar las salidas (tanto cabecera como detalle)
const registrarSalida = async (req, res = response) => { 
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


        const {observacion, productos} = req.body;
    
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
        if(cabecera.length != 0){
            //COMIENZA LA TRANSACCION
            t = await sequelize.transaction();

            const idCabecera=cabecera[0].dataValues.idCabecera;

            const cab ={
                fecha:fechaTiempoHoy,
                observacion,
                idusuario,
                idsucursal:idSucursal,
                idcabinventario:idCabecera
            }
            
            await CSalida.create(cab, { transaction: t });

                        
            const result = await sequelize.query('SELECT LAST_INSERT_ID() as lastId', {
                type: sequelize.QueryTypes.SELECT,
                transaction:t
            });
            
            const idCsalida = result[0].lastId;

            const data = await Promise.all(
                productos.map(async (producto) => {
                    const { idProducto, cantidad, salida } = producto;
                    const {idSalida}= salida;

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
                
                    //actualizamos el detalle de inventario de los productos, aumentando la cantidad de productos en baja
                    if (inventario.cantidadSalida === null) {
                        inventario.cantidadSalida = cantidad;
                    } else {
                        inventario.cantidadSalida += cantidad;
                    }
                    await inventario.save({ transaction: t });
            
                    return {
                        idcsalida: idCsalida, 
                        idproducto: idProducto,
                        idsalida:idSalida,
                        cantidad: cantidad,
                        // total: cantidad * prod.precio,
                        total: cantidad * inventario.dataValues.precio,
                    };
                })
            );

            //insertamos el detalle de la salida    
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


    const tiposSalida = async (req = request, res = response)=> {
    try {
        

        const [total,salida] = await Promise.all([
            Salida.count(),
            Salida.findAll()
        ]);
    
        res.json({
            total,
            salida
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Error al obtener los tipo de salida'});
    }
        
    }
  
  
    const visualizarSalidas = async (req, res = response) => { 
        try {
    
            const idSucursal= req.usuario.idsucursal;
            const turno=req.usuario.turno; 
            const fechaActual = moment().tz(zonaHorariaParaguay);
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
            
            //si es que ya existe una cabecera obtenemos su id y buscamos los registros de salidas que tengan como referencia esa cabecera
            if(cabecera.length > 0){
                const idCabecera=cabecera[0].dataValues.idCabecera;

                const dSalida = await DSalida.findAll({//se obtiene el precio del producto de dinventario pq es el que se utiliza durante la vigencia del inventario
                    where: {},
                    include: [
                        {
                            model: CSalida,
                            where: { idcabinventario: idCabecera },
                            include: [],
                            attributes:['fecha', 'idcabinventario']
                        },
                        {
                            model: Producto,
                            attributes: ['nombre', 'idproducto'],
                        }
                    ],
                    attributes: ['cantidad', 'idproducto', 'idcsalida', 'total', 
                        [
                            sequelize.literal(`(SELECT precio FROM DInventario WHERE DInventario.idproducto = DSalida.idproducto AND DInventario.idcabecera=${idCabecera})`),
                            'precio'
                        ]
                    ],
                });
    
                res.json({
                    dSalida
                });
    
    
            }else{
                res.status(500).send({msg:"No existe ninguna apertura"});
            }
    
        } catch (error) {
          res.status(500).json({msg:'Error al obtener los datos de salida'});
        }
      };

module.exports = {
    
    verExisteApertura,
    registrarSalida,
    
    tiposSalida,
    visualizarSalidas,
    visualizacionDisponible
    // productosSalida,
}
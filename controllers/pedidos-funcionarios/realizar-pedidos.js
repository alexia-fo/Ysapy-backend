//! -- SOLO PARA SERVICIOS DE FUNICIONARIO (SALIDA DE PRODUCTOS)--
//////////EMPLEADO///////
const { Producto, CInventario, CRecepcion, DInventario, Clasificacion } = require("../../model");

const sequelize = require('../../db/conections');
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const Marca = require("../../model/marca");
const DPedidoFabrica = require("../../model/dPedidoFuncionario");
const CPedidoFabrica = require("../../model/cPedidoFuncionario");
const Configuracion = require("../../model/parametro");
const Parametro = require("../../model/parametro");
const CPedidoFuncionario = require("../../model/cPedidoFuncionario");
const DPedidoFuncionario = require("../../model/dPedidoFuncionario");
const Unidad = require("../../model/unidad");
const zonaHorariaParaguay = 'America/Asuncion';


/*
primero se verifica si la fecha de entrega es posterior a la fecha actual. Si es así, se procede a registrar el pedido. Si la fecha de entrega es igual a 
la fecha actual, se verifica si estamos antes o después del límite de horario. Si estamos después del límite, se responde al cliente indicando que no se puede
 registrar el pedido. Si estamos antes del límite, se procede a registrar el pedido. Si la fecha de entrega es anterior a la fecha actual, también se responde al 
 cliente indicando que no se puede registrar el pedido.
*/


const obtenerLimiteHorario = async (codTurno) => {
    console.log("--- codTurno de funion ", codTurno);
    try {
        const configuracion = await Parametro.findOne({
            where: { idParametro: codTurno },
            attributes: ['valor'],
        });

        if (configuracion) {
            // Devuelve el límite de horario obtenido de la configuración
            const momentHoraLimite = moment(configuracion.valor, ['HH:mm:ss', 'H:mm:ss']);
            if (momentHoraLimite.isValid()) {
                return momentHoraLimite.format('HH:mm:ss');
            } else {
                console.error('Error: El valor devuelto no es una hora válida:', configuracion.valor);
                return '10:00:00';  // Valor predeterminado si hay un problema con el formato
            }
        } else {
            // Si no se encuentra la configuración, devuelve un valor predeterminado (puedes ajustarlo)
            return '10:00:00';
        }
    } catch (error) {
        console.error('Error al obtener el límite de horario limite de envio:', error);
        throw error;
    }
};


//TODO: LA ULTIMA VERSION FUNCIOANAL (ambos permiten la fecha actual pero uno con turno hasta las diez, y otro hasta las cuatro am)
// const verHorarioHabilitado = async (req, res) => {

//     try {

//         // Obtener la fecha actual según la zona horaria de Paraguay
//         const fechaActual = moment().tz(zonaHorariaParaguay);

//         const {codMarca, codTurno}= req.query;

//         // Verificar si la fecha de entrega es posterior a la fecha actual
//         const fechaEntrega = moment.tz(req.query.fechaEntrega, 'America/Asuncion');
//         // const fechaEntrega = moment(req.query.fechaEntrega).tz(zonaHorariaParaguay);


//         // Establecer la hora, minutos y segundos de las fechas a las 00:00:00
//         const fechaActualSinHora = fechaActual.clone().startOf('day');
//         const fechaEntregaSinHora = fechaEntrega.clone().startOf('day');
        
//         if (fechaEntregaSinHora.isAfter(fechaActualSinHora)) {
//             // La fecha de entrega es posterior a la fecha actual, se puede registrar el pedido
//             res.json({
//                 isAvailable:true,
//                 msg:"Pedido habilitado por que la fecha es superior"
//             })
//         } else if (fechaEntregaSinHora.isSame(fechaActualSinHora)) {
//             //TODO: deshabilitado por ahora (se pondra limite de horario para todos los productos en la primera version)
//             // if(codMarca==100 || codMarca==102){//si las marcas son de tipo panaderia o rostiseria se verifican los horarios, en caso de que sean de otra marca no es necesario restringen por ahora --> 
//                 // La fecha de entrega es igual a la fecha actual, se verifica el horario límite
//                 // La fecha de entrega es igual a la fecha actual, se verifica el horario límite
//                 const horaLimite = await obtenerLimiteHorario(codTurno);

//                 // Asegurarse de que `horaLimite` tiene el formato correcto
//                 const parts = horaLimite.split(':');

//                 if (parts.length !== 3 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
//                     res.json({
//                         isAvailable: false,
//                         msg: 'Error en el formato de la hora límite.'
//                     });
//                     return;
//                 }

//                 if (fechaActual.isAfter(moment(fechaEntrega).set({ 'hour': parseInt(parts[0]), 'minute': parseInt(parts[1]) }))) {
//                     // Se ha superado el límite de horario, no se puede registrar el pedido
//                     res.json({
//                         isAvailable: false,
//                         msg: 'No se puede registrar el pedido, ha superado el límite de horario.'
//                     });
//                 } else {
//                     // Todavía estamos dentro del límite de horario, se puede registrar el pedido
//                     res.json({
//                         isAvailable: true,
//                         msg: "Pedido habilitado"
//                     });
//                 }
//             // }else{//TODO: deshabilitado por ahora (se pondra limite de horario para todos los productos en la primera version)
//             //     res.json({
//             //         isAvailable:true,
//             //         msg:"Habilitado porque la marca no es panaderia ni rostiseria"
//             //     })
//             // }
//         } else {
//             // La fecha de entrega es anterior a la fecha actual, no se puede registrar el pedido
//             res.json({
//                 isAvailable:false,
//                 msg: 'No se puede registrar una fecha anterior a la fecha actual.'})
//             return;
//         }

//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ msg: 'Error al verificar los horarios' });
//     }
// };

/*
const verHorarioHabilitado  = async (req, res)=>{
   
    //TODO : VERSION 1 FUNCIONANDO VALIDACION HASTA LAS 10 solo con node (validacion sin horas dinamicas y hasta fecha anterior con el limite de horario 10)
    
    //    // Obtener la fecha actual en UTC
    //    const fechaActual = new Date();
    //    //fechaActual.setUTCHours(10, 0, 0, 0); // Establecer a las 10:00 am UTC
       
    //    // Obtener la fecha de entrega del producto del req.query en UTC
    //    const fechaEntrega = new Date(req.query.fechaEntrega);
    //    fechaEntrega.setUTCHours(0, 0, 0, 0); // Ajustar a la medianoche UTC
       
    //    // Calcular la fecha límite para el registro del pedido en UTC
    //    const fechaLimite = new Date(fechaEntrega);
    //    fechaLimite.setUTCDate(fechaLimite.getUTCDate() - 1); // Restar un día
    //    fechaLimite.setUTCHours(10, 0, 0, 0); // Establecer a las 10:00 am UTC
    
    
    //     // Validar si el pedido se puede registrar o no
    //     if (fechaActual <= fechaLimite) {
    //         console.log('Pedido registrado exitosamente.' );
    //         console.log('fechaActual.', fechaActual);
    //         console.log('fechaEntrega', fechaEntrega);
    //         console.log('fechaLimite', fechaLimite);
    //         res.send('Pedido registrado exitosamente.');
    //     } else {
    //         console.log('No se puede registrar el pedido. Fecha límite excedida.');
    //         console.log('fechaActual.', fechaActual);
    //         console.log('fechaEntrega', fechaEntrega);
    //         console.log('fechaLimite', fechaLimite);
    //         res.status(400).send('No se puede registrar el pedido. Fecha límite excedida.' );
    //     }
        
    
        //TODO: VERSION 2 EN PROCESO DE PRUEBA con paquete moment-timezone (validacion con horas dinamicas pero ambos turnos estan configurados hasta el dia anterior hasta cierto horario)
        //TODO:LA NUEVA VERSION A PROBAR (sin tener en cuenta el horario por turnos - sin tener en cuenta las prepizzas)
        console.log('----------------')
        const {codTurno, codMarca}= req.query
    
        // Obtener la fecha actual en la zona horaria de Paraguay
        //const fechaActual = moment().tz('America/Asuncion').startOf('day');
        const fechaActual = moment().tz('America/Asuncion');
        
        // Obtener la fecha de entrega del producto del req.query en la zona horaria de Paraguay
        const fechaEntrega = moment.tz(req.query.fechaEntrega, 'America/Asuncion').startOf('day');

        ////////////
        const horaLimite = await obtenerLimiteHorario(codTurno);
        console.log('hora limite ---> ', horaLimite)

        // Asegurarse de que `horaLimite` tiene el formato correcto
        const parts = horaLimite.split(':');

        if (parts.length !== 3 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
            res.json({
                isAvailable: false,
                msg: 'Error en el formato de la hora límite.'
            });
            return;
        }
        /////////////
        
        // Calcular la fecha límite para el registro del pedido en la zona horaria de Paraguay
        const fechaLimite = moment.tz(fechaEntrega, 'America/Asuncion').subtract(1, 'days').startOf('day').add(parseInt(parts[0]), 'hours');
        
        // Validar si el pedido se puede registrar o no
        if (fechaActual <= fechaLimite) {
            console.log('Pedido registrado exitosamente.');
            console.log('fechaActual:', fechaActual.toString());
            console.log('fechaEntrega:', fechaEntrega.toString());
            console.log('fechaLimite:', fechaLimite.toString());
            // res.send('Pedido registrado exitosamente.');
            res.json({
                isAvailable: true,
                msg: "Pedido habilitado"
            });
        } else {
            console.log('No se puede registrar el pedido. Fecha límite excedida.');
            console.log('fechaActual:', fechaActual.toString());
            console.log('fechaEntrega:', fechaEntrega.toString());
            console.log('fechaLimite:', fechaLimite.toString());
            // res.status(400).send('No se puede registrar el pedido. Fecha límite excedida.');
            res.json({
                isAvailable: false,
                msg: `Pedido no habilitado - El limite de tiempo es: ${fechaLimite.format('DD-MM-YYYY HH:mm:ss')}`
            });
        
        }
    
}
*/

const verHorarioHabilitado  = async (req, res)=>{

        console.log('----------------')
        const {codTurno, codMarca}= req.query

        if(codTurno==1){//para las prepizzas

            // Obtener la fecha actual en la zona horaria de Paraguay
            //const fechaActual = moment().tz('America/Asuncion').startOf('day');
            const fechaActual = moment().tz('America/Asuncion');
            
            // Obtener la fecha de entrega del producto del req.query en la zona horaria de Paraguay
            const fechaEntrega = moment.tz(req.query.fechaEntrega, 'America/Asuncion').startOf('day');

            ////////////
            const horaLimite = await obtenerLimiteHorario(codTurno);
            console.log('hora limite ---> ', horaLimite)

            // Asegurarse de que `horaLimite` tiene el formato correcto
            const parts = horaLimite.split(':');

            if (parts.length !== 3 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
                res.json({
                    isAvailable: false,
                    msg: 'Error en el formato de la hora límite.'
                });
                return;
            }
            /////////////
            
            // Calcular la fecha límite para el registro del pedido en la zona horaria de Paraguay
            const fechaLimite = moment.tz(fechaEntrega, 'America/Asuncion').startOf('day').add(parseInt(parts[0]), 'hours');
            
            // Validar si el pedido se puede registrar o no
            if (fechaActual <= fechaLimite) {
                console.log('Pedido registrado exitosamente.');
                console.log('fechaActual:', fechaActual.toString());
                console.log('fechaEntrega:', fechaEntrega.toString());
                console.log('fechaLimite:', fechaLimite.toString());
                // res.send('Pedido registrado exitosamente.');
                res.json({
                    isAvailable: true,
                    msg: "Pedido habilitado"
                });
            } else {
                console.log('No se puede registrar el pedido. Fecha límite excedida.');
                console.log('fechaActual:', fechaActual.toString());
                console.log('fechaEntrega:', fechaEntrega.toString());
                console.log('fechaLimite:', fechaLimite.toString());
                // res.status(400).send('No se puede registrar el pedido. Fecha límite excedida.');
                res.json({
                    isAvailable: false,
                    msg: `Pedido no habilitado - El limite de tiempo es: ${fechaLimite.format('DD-MM-YYYY HH:mm:ss')}`
                });
            
            }
        }else if(codTurno==2){//si son para todos los productos menos las prepizzas

            // Obtener la fecha actual en la zona horaria de Paraguay
            //const fechaActual = moment().tz('America/Asuncion').startOf('day');
            const fechaActual = moment().tz('America/Asuncion');
            
            // Obtener la fecha de entrega del producto del req.query en la zona horaria de Paraguay
            const fechaEntrega = moment.tz(req.query.fechaEntrega, 'America/Asuncion').startOf('day');

            ////////////
            const horaLimite = await obtenerLimiteHorario(codTurno);
            console.log('hora limite ---> ', horaLimite)

            // Asegurarse de que `horaLimite` tiene el formato correcto
            const parts = horaLimite.split(':');

            if (parts.length !== 3 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
                res.json({
                    isAvailable: false,
                    msg: 'Error en el formato de la hora límite.'
                });
                return;
            }
            /////////////
            
            // Calcular la fecha límite para el registro del pedido en la zona horaria de Paraguay
            const fechaLimite = moment.tz(fechaEntrega, 'America/Asuncion').subtract(1, 'days').startOf('day').add(parseInt(parts[0]), 'hours');
            
            // Validar si el pedido se puede registrar o no
            if (fechaActual <= fechaLimite) {
                console.log('Pedido registrado exitosamente.');
                console.log('fechaActual:', fechaActual.toString());
                console.log('fechaEntrega:', fechaEntrega.toString());
                console.log('fechaLimite:', fechaLimite.toString());
                // res.send('Pedido registrado exitosamente.');
                res.json({
                    isAvailable: true,
                    msg: "Pedido habilitado"
                });
            } else {
                console.log('No se puede registrar el pedido. Fecha límite excedida.');
                console.log('fechaActual:', fechaActual.toString());
                console.log('fechaEntrega:', fechaEntrega.toString());
                console.log('fechaLimite:', fechaLimite.toString());
                // res.status(400).send('No se puede registrar el pedido. Fecha límite excedida.');
                res.json({
                    isAvailable: false,
                    msg: `Pedido no habilitado - El limite de tiempo es: ${fechaLimite.format('DD-MM-YYYY HH:mm:ss')}`
                });
            
            }
        }
    
    
}

//FIXME: 2. OBTENER LAS MARCAS REGISTRADAS PARA COMBO (UNA VEZ SELECCIONADA LA MARCA EL FRONT SOLICITARA LOS PRODUCTOS DE ESA MARCA)

const marcasGet = async (req = request, res = response)=> {

    try { 

        const [total, marca] = await Promise.all([
            Marca.count({}),
            Marca.findAll()
        ]);

        res.json({
            total,
            marca
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al obtener las marcas de productos'});
    }
    
}

//FIXME: 2. OBTENER LOS HORARIOS REGISTRADOS

const turnosGet = async (req = request, res = response)=> {

    try { 

        const [total, turno] = await Promise.all([
            Parametro.count({}),
            Parametro.findAll()
        ]);

        res.json({
            total,
            turno
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({msg:'Error al obtener los turnos de pedidos'});
    }
    
}


    //FIXME: 4. OBTIENE EL LISTADO DE PRODUCTOS QUE CORRESPONDEN A UNA MARCA, ESTOS PRODUCTOS LUEGO SERAN SELECCIONADOS PARA REALIZAR LOS PEDIDOS

const productosGet = async (req = request, res = response)=> {
    let limite = req.query.limite;
    let desde = req.query.desde;
    let codMarca = req.params.idMarca;

    try {

        if (!limite && !desde) {// si no se envian los parametros desde y limite se retornaran todos los registros
            
            const [total, producto] = await Promise.all([
                Producto.count({
                    where:{idmarca:codMarca},
                }),
                Producto.findAll({
                    where:{idmarca:codMarca},
                    attributes:['idProducto', 'nombre', 'precio', 'descripcion'],
                    include:[
                        {
                            model:Unidad,
                            attributes:['NombreUnidad']
                        }
                    ]
                })
            ]);

            res.json({
                total,
                producto
            });
        } else if (limite !== undefined && desde !== undefined) { //si se envia los parametros limite y desde, estos se utilizaran para tener en cuenta la cantidad de registros a retornar
            limite = parseInt(limite);
            desde = parseInt(desde);

            if (limite <= desde) {
                return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
            }

            const [total, producto] = await Promise.all([
                Producto.count({
                    where:{idmarca:codMarca},
                }),
                Producto.findAll({
                    where:{idmarca:codMarca},
                    attributes:['idProducto', 'nombre', 'precio', 'descripcion'],
                    offset: desde,
                    limit: limite,
                })
            ]);

            res.json({
                total,
                producto
            });
        } else {
            return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
        }
    
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los productos" });
    }
}

//FIXME: 4. UNA VEZ SELECCIONADOS LOS PRODUCTOS Y ESTABLECIDAS LAS CANTIDADES SE REGISTRA EL PEDIDO
const registrarPedido = async (req, res = response) => { 
    let t; //genera la transaccion
    
    try {
        const idSucursal = req.usuario.idsucursal; //para obtner la cabecera de esta sucursal

        const idusuario=req.usuario.idUsuario;

        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        
        const fechaTiempoHoy = fechaActual.format('YYYY-MM-DD HH:mm:ss');

        //datos a registrar
        const {observacion, productos, fechaEntrega, marca, turno} = req.body;

        const fechaEntregaFormateada = moment(fechaEntrega).format('YYYY-MM-DD');

        console.log(`--------------Fecha de entrega ${fechaEntrega} - Fecha de entrega formateada ${fechaEntregaFormateada}`)

        //COMIENZA LA TRANSACCION
        t = await sequelize.transaction();
        
        //cabecera del pedido
        const cab ={
            fechaAlta:fechaTiempoHoy,
            observacion,
            idusuario,
            idsucursal:idSucursal,
            // fechaEntrega: fechaEntregaFormateada,
            fechaEntrega: fechaEntrega,
            idmarca:marca,
            turno
            // idcabinventario:idCabecera
        }
        
        await CPedidoFabrica.create(cab, { transaction: t });
        
        const result = await sequelize.query('SELECT LAST_INSERT_ID() as lastId', {
            type: sequelize.QueryTypes.SELECT,
            transaction:t
        });
        
        const idCpedido = result[0].lastId;
        
        //datos a guradar en el detalle del pedido
        const data = await Promise.all(
            productos.map(async (producto) => {
                const { idProducto, cantidad } = producto;

                const prod = await Producto.findByPk(idProducto);
            
                if (!prod) {
                    throw new Error(`El producto con id ${idProducto} no existe`);
                    //! de esta manera no funciona, genera error
                    // t.rollback();
                    // res.status(409).send({msg:`El producto con id ${idProducto} no existe`});
                }
                return {
                    idcpedido: idCpedido, 
                    idproducto: idProducto,
                    cantidad,
                };
            })
        );

        //insertamos el detalle de los pedidos    
        await DPedidoFabrica.bulkCreate(await Promise.all(data), {
            transaction: t,
        });
    
        await t.commit();

        res.status(201).json({msg:"Pedido Registrado correctamente"});                


    } catch (error) {
      if (t) await t.rollback(); // Verificar que t esté definido antes de llamar a rollback()
      res.status(500).json({msg:'Error al realizar la transacción'});
    }
};

//FIXME: EDITAR PEDIDOS
const pedidoGet = async (req = request, res = response) => {
    const { idCabecera } = req.params;

    console.log(`--- idCabecera ${idCabecera}`)

    // try {
        const [cabecera, detalles] = await Promise.all([
            CPedidoFuncionario.findByPk(idCabecera),
            DPedidoFabrica.findAll({
                where: { idcpedido: idCabecera },
                attributes: ['idproducto', 'cantidad'],
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
                    }
                ]
            })
        ]);

        // Formatear los detalles del pedido
        const productos = detalles.map(det => ({
            idProducto: det.idproducto,
            cantidad: det.cantidad,
            nombre: det.Producto.nombre, // Acceso directo al nombre del producto
            unidad: det.Producto.Unidad.NombreUnidad // Acceso directo al nombre del producto
        }));

        res.json({
            turno:cabecera.turno,
            observacion: cabecera.observacion,
            fechaEntrega: cabecera.fechaEntrega,
            marca: cabecera.idmarca,

            productos
        });

    // } catch (error) {
    //     console.log(error);
    //     res.status(500).json({ msg: 'Error al obtener los detalles del pedido' });
    // }

}


// const editarPedido = async (req, res = response )=> {
    
//     const {idCabecera} = req.params;
//     const {observacion, fechaEntrega, marca, productos, turno  } = req.body; // se utiliza de esta forma para obviar los campos   

//     try {
            
//         res.json({observacion, fechaEntrega, marca, productos, turno});
//    } catch (error) {
//         console.log(error);
//         res.status(500).json({
//             msg: 'Error al actualizar el pedido'
//         });
//    }
// }

const editarPedido = async (req, res = response) => {
    const { idCabecera } = req.params;
    const { observacion, fechaEntrega, marca, productos, turno } = req.body;

    let t;

    console.log(observacion, fechaEntrega, marca, productos, turno)

    try {
        // Inicia la transacción
        t = await sequelize.transaction();

        // Elimina los registros de dPedidoFuncionario asociados a la cabecera idCabecera
        await DPedidoFuncionario.destroy({ where: { idcpedido: idCabecera }, transaction: t });

        // Recorre los productos para insertarlos nuevamente en la tabla dPedidoFuncionario
        await Promise.all(
            productos.map(async (producto) => {
                const { idProducto, cantidad } = producto;
                await DPedidoFuncionario.create({ idcpedido: idCabecera, idproducto: idProducto, cantidad }, { transaction: t });
            })
        );

        // Actualiza la cabecera del pedido
        await CPedidoFuncionario.update(
            { observacion, fechaEntrega, idmarca: marca, turno },
            { where: { idCabecera }, transaction: t }
        );

        // Confirma la transacción
        await t.commit();

        res.status(200).json({ msg: 'Pedido actualizado correctamente' });
    } catch (error) {
        if (t) await t.rollback(); // Si hay una transacción definida, realiza un rollback
        console.log(error);
        res.status(500).json({ msg: 'Error al actualizar el pedido' });
    }
};


  module.exports = {
    // verHabilitacion,
    marcasGet,
    turnosGet,
    productosGet,
    registrarPedido,
    verHorarioHabilitado,
    pedidoGet,
    editarPedido
}
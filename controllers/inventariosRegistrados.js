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

////////////////prueba
//Para transacciones
const sequelize = require('../db/conections');

    
//!para listar las cabeceras en la tabla
const obtenerCabecerasInventario = async (req = request, res = response)=> {

    //PARA OBTENER POR DEFECTO LOS INVENTARIOS DE LOS ULTIMOS 15 DIAS

    // Obtener la fecha actual según la zona horaria de Paraguay
    const fechaActual = moment().tz(zonaHorariaParaguay);
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHoy = fechaActual.format('YYYY-MM-DD');

    // Restar 15 días a la fecha actual
    const fechaHace7Dias = fechaActual.subtract(15, 'days');
    // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
    const fechaHace7DiasFormateada = fechaHace7Dias.format('YYYY-MM-DD');

    const  {limite = fechaHoy, desde =fechaHace7DiasFormateada, sucursal='todos', estado='todos', turno='todos'} = req.query;
    
    // let limiteFecha=moment(limite).tz(zonaHorariaParaguay).format('YYYY/MM/DD');
    // let desdeFecha=moment(desde).tz(zonaHorariaParaguay).format('YYYY/MM/DD');
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

//para ver los calculos entre la rendicion y el inventario. Tambien para ver los detalles de inventario y de rendicion
const obtenerCalculoRendicion = async (req = request, res = response)=> {
    // const {idCabecera}=req.query;
    const {idCabecera}=req.params;

    try {
        //en este punto ya se verificó si la cabecera existe
        const cabecera = await CInventario.findOne({
            where: {
                idCabecera
            } 
        });
        
        // Consulta para obtener los campos y calcular el total 
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
        
        //sumar todos los totales de dinero de cada uno de los productos
        // Calcular el totalFinal sumando todos los valores de totalMultiplicado
        const totalVenta = detalleInventario.reduce((total, item) => {
            total += parseFloat(item.dataValues.totalMultiplicado);
            return total;
        }, 0);

        
        // console.log('-------------------------------')
        // console.log('detalle i ', detalleInventario);
        // console.log('totalVenta ', totalVenta);
    
        const detalleRendicion = await DRendicion.findAll({
            where: { idcabecera: idCabecera },
            attributes: [
                'cantidadApertura',
                'cantidadCierre',
                'totalApertura',
                'totalCierre',
                [Sequelize.literal('(totalCierre - totalApertura)'), 'montoTotal'],
            ],
            include: [
                {
                    model: Dinero,
                    attributes: ['nombreBillete', 'monto'], // Agregamos el campo monto
                },
            ],
            order: [
                [{ model: Dinero }, 'monto', 'ASC'] // Ordena por monto de Dinero en forma ascendente
            ]
        });
        
        //TODO:PROBANDO COBROS POR CREDITOS
        const totalOtrosCobros = cabecera.montoOtrosCobros;
    
        const totalAperturaDinero = cabecera.montoApertura;
    
        const totalCierreDinero = cabecera.montoCierre;
    
        const totalDiferenciaDinero = parseInt(cabecera.montoDiferencia); // diferencia entre entradas de dinero, no incluye pagos ni creditos
    
        const totalPendiente = parseInt(cabecera.montoPendiente);//incluyen los pagos realizados y los creditos de clientes por cobrar
        //total venta - (total cobrado + total pendiente)
        const diferenciaVentaCaja=totalVenta-(totalDiferenciaDinero+totalPendiente);
    
        let descVentaCaja='';
    
        if(diferenciaVentaCaja>0){
            descVentaCaja='Sobrante';
        }else if(diferenciaVentaCaja<0){
            descVentaCaja='Faltante';
        }else if(diferenciaVentaCaja==0){
            descVentaCaja='Exacto'
        }else{
            descVentaCaja='Hubo algun error'
        }
    
        res.json({
            detalleInventario,
            detalleRendicion,
            totalVenta,
            totalAperturaDinero,
            totalCierreDinero,
            totalDiferenciaDinero,
            totalPendiente,
            totalOtrosCobros,
            diferenciaVentaCaja,
            descVentaCaja
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los calculos de la rendicion" });
    }

}

//para ver los calculos entre la rendicion y el inventario. Tambien para ver los detalles de inventario y de rendicion
const obtenerRendicion = async (req = request, res = response)=> {
    // const {idCabecera}=req.query;
    const {idCabecera}=req.params;

    try {
        //en este punto ya se verificó si la cabecera existe
        const cabecera = await CInventario.findOne({
            where: {
                idCabecera
            } 
        });
        
        // Consulta para obtener los campos y calcular el total 
        const detalleInventario = await DInventario.findAll({
            where: { idcabecera: idCabecera },
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
            order: [
                [{ model: Producto }, 'nombre', 'ASC'] // Ordena por nombre del Producto en forma ascendente
            ]
        });
    
        const detalleRendicion = await DRendicion.findAll({
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
                    attributes: ['nombreBillete', 'monto'], // Agregamos el campo monto
                },
            ],
            order: [
                [{ model: Dinero }, 'monto', 'ASC'] // Ordena por monto de Dinero en forma ascendente
            ]
        });
+
    
        res.json({
            detalleInventario,
            detalleRendicion,
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los calculos de la rendicion" });
    }

}

//TODO:para calcular la venta todas las recepciones se suman a la cantidad de apertura
const obtenerCalculo = async (req = request, res = response)=> {
    // const {idCabecera}=req.query;
    const {idCabecera}=req.params;

    try {
        //en este punto ya se verificó si la cabecera existe
        const cabecera = await CInventario.findOne({
            where: {
                idCabecera
            } 
        });
        
        // Consulta para obtener los campos y calcular el total 
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
                // [Sequelize.literal('DInventario.precio * ((cantidadApertura+cantidadRecepcion) - (cantidadCierre + cantidadRecepcion) - cantidadSalida)'), 'totalMultiplicado'],
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
        
        //sumar todos los totales de dinero de cada uno de los productos
        // Calcular el totalFinal sumando todos los valores de totalMultiplicado
        const totalVenta = detalleInventario.reduce((total, item) => {
            console.log(parseFloat(item.dataValues.totalMultiplicado));
            total += parseFloat(item.dataValues.totalMultiplicado);
            console.log('**' ,total)
            return total;
        }, 0);

        console.log('-------------------------------')
        console.log('detalle i ', detalleInventario);
        console.log('totalVenta ', totalVenta);

        //TODO:PROBANDO COBROS POR CREDITOS
        const totalOtrosCobros = cabecera.montoOtrosCobros;

        const totalAperturaDinero = cabecera.montoApertura;
    
        const totalCierreDinero = cabecera.montoCierre;
    
        const totalDiferenciaDinero = parseInt(cabecera.montoDiferencia); // diferencia entre entradas de dinero, no incluye pagos ni creditos
    
        const totalPendiente = parseInt(cabecera.montoPendiente);//incluyen los pagos realizados y los creditos de clientes por cobrar
        //total venta - (total cobrado + total pendiente)
        const diferenciaVentaCaja=totalVenta-(totalDiferenciaDinero+totalPendiente);
    
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
            totalPendiente,
            diferenciaVentaCaja,
            descVentaCaja,
            totalOtrosCobros
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los calculos de la rendicion" });
    }

}

//TODO:para calcular la venta, solo se suman a la cantidad de apertura las cantidades recepcionadas antes que se cierre el inventario 
// const obtenerCalculo = async (req = request, res = response)=> {
//     // const {idCabecera}=req.query;
//     const {idCabecera}=req.params;

//     try {
//         //en este punto ya se verificó si la cabecera existe
//         const cabecera = await CInventario.findOne({
//             where: {
//                 idCabecera
//             } 
//         });
        
//         // Consulta para obtener los campos y calcular el total 
//         //TODO:SOLO CON RECEPCIONES
//         // const results = await sequelize.query(`

//         // SELECT
//         // di.idproducto AS idProducto,
//         // SUM(
//         //     CASE
//         //         WHEN cr.fecha < ci.fechaCierre THEN 
//         //             COALESCE(dr.cantidad, 0) + di.cantidadApertura - di.cantidadCierre
//         //         ELSE 
//         //             di.cantidadApertura - di.cantidadCierre
//         //     END
//         // ) AS cantidadVendida,
//         // ci.idCabecera,
//         // p.nombre,
//         // di.precio
//         // FROM
//         //     CInventario ci
//         // JOIN
//         //     DInventario di ON ci.idCabecera = di.idcabecera
//         // JOIN
//         //     CRecepcion cr ON ci.idCabecera = cr.idcabinventario
//         // LEFT JOIN
//         //     (
//         //         SELECT idproducto, idcrecepcion, SUM(cantidad) AS cantidad
//         //         FROM DRecepcion
//         //         GROUP BY idproducto, idcrecepcion
//         //     ) dr ON dr.idcrecepcion = cr.idRecepcion AND dr.idproducto = di.idproducto
//         // JOIN
//         //     producto p ON p.idProducto = di.idproducto
//         // WHERE
//         //     ci.idCabecera=131
//         // GROUP BY
//         //     di.idproducto, ci.idCabecera;
        
//         // `);

//         const results = await sequelize.query(
//             `SELECT
//             di.idproducto AS idProducto,
//             SUM(
//                 CASE
//                     WHEN cr.fecha < ci.fechaCierre THEN 
        
//         /*                COALESCE(dr.cantidad, 0) + di.cantidadApertura - di.cantidadCierre */
                        
//                                 CASE
//                         WHEN cs.fecha < ci.fechaCierre THEN 
//                         COALESCE(dr.cantidad, 0) + di.cantidadApertura - di.cantidadCierre-COALESCE(ds.cantidad, 0)
//                         ELSE 
//                         COALESCE(dr.cantidad, 0) + di.cantidadApertura - di.cantidadCierre
//                     END
//                     ELSE 
//                        /* di.cantidadApertura - di.cantidadCierre*/
//                                 CASE
//                         WHEN cs.fecha < ci.fechaCierre THEN 
//                         di.cantidadApertura - di.cantidadCierre-COALESCE(ds.cantidad, 0)
//                         ELSE 
//                         di.cantidadApertura - di.cantidadCierre
//                     END       
                        
//                 END
//             ) AS cantidadVendida,
//             ci.idCabecera,
//             p.nombre,
//             di.precio
//         FROM
//             CInventario ci
//         JOIN
//             DInventario di ON ci.idCabecera = di.idcabecera
//         LEFT JOIN
//             CRecepcion cr ON ci.idCabecera = cr.idcabinventario
//         LEFT JOIN
//             (
//                 SELECT idproducto, idcrecepcion, SUM(cantidad) AS cantidad
//                 FROM DRecepcion
//                 GROUP BY idproducto, idcrecepcion
//             ) dr ON dr.idcrecepcion = cr.idRecepcion AND dr.idproducto = di.idproducto
            
//         LEFT JOIN
//             CSalida cs ON ci.idCabecera = cs.idcabinventario
//         LEFT JOIN
//             (
//                 SELECT idproducto, idsalida,idcsalida, SUM(cantidad) AS cantidad
//                 FROM DSalida
//                 GROUP BY idproducto, idcsalida
//             ) ds ON ds.idcsalida = cs.idCabecera AND ds.idproducto = di.idproducto    
            
//         JOIN
//             producto p ON p.idProducto = di.idproducto
//         WHERE
//             ci.idCabecera=${idCabecera}
//         GROUP BY
//             di.idproducto, ci.idCabecera;`
//         )
                
//         // console.log('--------- ----------------------')
//         // console.log('detalle i ', results);
 
//         // Supongamos que "results" contiene los resultados de la consulta.
//         const resultados = results[0];

//         // Inicializamos una variable para almacenar el total.
//         let totalVenta = 0;

//         // Recorremos los resultados y calculamos el total final.
//         resultados.forEach((fila) => {
//             const cantidadVendida = fila.cantidadVendida;
//             const precio = fila.precio;
//             totalVenta += cantidadVendida * precio;
//         });

//         // console.log('totalVenta:', totalVenta);

//         // console.log('-------------------------------')
//         // console.log('totalVenta ', totalVenta);

//         //TODO:PROBANDO COBROS POR CREDITOS
//         const totalOtrosCobros = cabecera.montoOtrosCobros;

//         const totalAperturaDinero = cabecera.montoApertura;
    
//         const totalCierreDinero = cabecera.montoCierre;
    
//         const totalDiferenciaDinero = parseInt(cabecera.montoDiferencia); // diferencia entre entradas de dinero, no incluye pagos ni creditos
    
//         const totalPendiente = parseInt(cabecera.montoPendiente);//incluyen los pagos realizados y los creditos de clientes por cobrar
//         //total venta - (total cobrado + total pendiente)
//         const diferenciaVentaCaja=totalVenta-(totalDiferenciaDinero+totalPendiente);
    
//         let descVentaCaja='';
    
//         if(diferenciaVentaCaja>0){
//             descVentaCaja='Sobrante';
//         }else if(diferenciaVentaCaja<0){
//             descVentaCaja='Faltante';
//         }else if(diferenciaVentaCaja==0){
//             descVentaCaja='Exacto'
//         }else{
//             descVentaCaja='Hubo algun error'
//         }
    
//         res.json({
//             totalVenta,
//             totalAperturaDinero,
//             totalCierreDinero,
//             totalDiferenciaDinero,
//             totalPendiente,
//             diferenciaVentaCaja,
//             descVentaCaja,
//             totalOtrosCobros
//         });
        
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ error: "Error al obtener los calculos de la rendicion" });
//     }

// }

const obtenerDetalleRendicion=async (req, res)=>{
    const {idCabecera}=req.params;

    const detalleRendicion = await DRendicion.findAll({
        where: { idcabecera: idCabecera },
        attributes: [
            'cantidadApertura',
            'cantidadCierre',
            'totalApertura',
            'totalCierre',
            // [Sequelize.literal('(totalCierre - totalApertura)'), 'montoTotal'],
        ],
        include: [
            {
                model: Dinero,
                attributes: ['nombreBillete', 'monto'], // Agregamos el campo monto
            },
        ],
        order: [
            [{ model: Dinero }, 'monto', 'ASC'] // Ordena por monto de Dinero en forma ascendente
        ]
    });

    res.json({
        detalleRendicion,
    });

}

const obtenerDetalleInventario = async(req, res)=>{
    const {idCabecera}=req.params;

    // Consulta para obtener los campos y calcular el total 
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

    res.json({
        detalleInventario,
    });
}

const obtenerDetalleRecepcion = async (req = request, res = response)=> {
    const {idCabecera}=req.query;
    const {idProducto}=req.query;

    //En este punto ya se ha validado si existe la cabecera y el producto
    
    // Primero, buscamos la DRecepcion con el idProducto y el idCInventario proporcionados
    const dRecepcion = await DRecepcion.findAll({
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
    });

    if (!dRecepcion) {
        return res.status(500).json({ msg: 'Producto no encontrado en el inventario proporcionado' });
    }

    res.json({
        dRecepcion,
    });
    
}

const obtenerDetalleSalida = async (req = request, res = response)=> {
    const {idCabecera}=req.query;
    const {idProducto}=req.query;
    
    // Primero, buscamos la DRecepcion con el idProducto y el idCInventario proporcionados
    const dSalida = await DSalida.findAll({
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
    });

    if (!dSalida) {
        return res.status(500).json({ msg: 'Producto no encontrado en el inventario proporcionado' });
    }
    
    res.json({
        dSalida,
    });
        
}


module.exports={
    obtenerCabecerasInventario,
    obtenerCalculoRendicion,
    obtenerDetalleInventario,
    obtenerDetalleRendicion,
    obtenerDetalleRecepcion,
    obtenerDetalleSalida,
    obtenerRendicion,
    obtenerCalculo
}
/*

si cuento con los siguientes modelos como puedo calcular la cantidad de productos que 
realmente vendi teniendo en cuenta que estoy llevando el control de productos o inventario 
en mi local de ventas, mi necesidad es lo siguiente: en CInventario esta el campo fechaCierre
el mismo corresponde a la fecha y hora de cierre del inventario el detalle del cierre de inventario
de productos esta en DInventario en donde para saber la cantidad vendida de cada producto se resta 
cantidadApertura-cantidadCierre, en la tabla CRecepcion se registra la recepcion de productos que aumenta 
los productos ya existentes en el local, el mismo cuenta con el campo fecha que indica la hora en que se registro la 
recepcion, esta tabla tambien tiene una tabla detalle llamada DRecepcion que se utiliza para registrar los productos 
recepcionados; lo que necesito es que calcules la cantidad real de productos vendidos teniendo en cuenta que si 
la venta es igual a (cantidadApertura+cantidad)-cantidadCierre si la fecha de CRecepcion es inferior a la fechaCierre de CInventario
y la venta es igual a (cantidadApertura-cantidadCierre. Para calcular es necesario utilizar el DInventario
de manera que luego se recorra cada cabecera de CRecepcion para verificar la hora de recepcion y calcular segun la fecha
si se debe sumar o no la cantidad de recepcion a la cantidad de venta calculada de cada producto, los modelos son los siguientes

*/
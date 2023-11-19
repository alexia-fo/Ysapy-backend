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
            } 
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
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los calculos de la rendicion" });
    }
}

//FIXME: listar las cantidades de apertura y cierre de dinero
const obtenerDetalleRendicion=async (req, res)=>{
    const {idCabecera}=req.params;
    
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
                attributes: ['nombreBillete', 'monto'], 
            },
        ],
        order: [
            [{ model: Dinero }, 'monto', 'DESC'] 
        ]
    });
    
    res.json({
        detalleRendicion,
    });
}

//FIXME: listar las cantidades de apertura y cierre de cada producto
const obtenerDetalleInventario = async(req, res)=>{
    const {idCabecera}=req.params;

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

/*FIXME: obtener todas las recepciones que tuvo un producto durante una rendicion */
const obtenerDetalleRecepcion = async (req = request, res = response)=> {
    const {idCabecera}=req.query;
    const {idProducto}=req.query;

    //En este punto ya se ha validado si existe la cabecera y el producto
    
    // Primero, buscamos el DRecepcion con el idProducto y el idCInventario proporcionados
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

const obtenerRecepciones = async (req, res = response) => {
    const {idCabecera}=req.query;

    try {
  
            const dRecepcion = await DRecepcion.findAll({//se obtiene el precio del producto de dinventario pq es el que se utiliza durante la vigencia del inventario
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
                        attributes:['fecha', 'observacion', 'nroComprobante',]
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
            

            res.json({
                dRecepcion
            });

    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener los datos de la recepcion:'});//+error.message
    }
};

//FIXME: obtener todas las salidas que tuvo un producto durante una rendicion
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

const obtenerSalidas = async (req = request, res = response)=> {
    const {idCabecera}=req.query;
    
    try {

        // Primero, buscamos la DRecepcion con el idProducto y el idCInventario proporcionados
        const dSalida = await DSalida.findAll({
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
        });

        if (!dSalida) {
            return res.status(500).json({ msg: 'Producto no encontrado en el inventario proporcionado' });
        }
        
        res.json({
            dSalida,
        });

    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener los datos de la recepcion:'});//+error.message
    }
}



module.exports={
    obtenerCabecerasInventario,
    obtenerCalculo,
    obtenerDetalleInventario,
    obtenerDetalleRendicion,
    obtenerDetalleRecepcion,
    obtenerRecepciones,
    obtenerDetalleSalida,
    obtenerSalidas
}

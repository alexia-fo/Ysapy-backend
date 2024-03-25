//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { obtenerCabecerasInventario, obtenerDetalleRecepcion, obtenerDetalleSalida, obtenerDetalleRendicion, obtenerDetalleInventario, obtenerCalculo, obtenerRecepciones, obtenerSalidas, editarCantidadProducto, editarCantidadesProductos, obtenerCabecerasRecepciones, obtenerDetalleRecepcionCab, modificarEstadoRecepcion, registrarMasRecepcion, pruebaGetParaJava, editarPrecioProducto, obtenerCabecerasSalidas, obtenerDetalleSalidaCab, modificarEstadoSalida, registrarMasSalida } = require('../controllers/inventariosRegistrados');
const { existeCabInventario, existeProducto } = require('../helpers/db-validators');

const router = Router();

//FIXME:para listar las cabeceras de inventarios en la tabla de inventarios
//para listar las cabeceras de inventario
//posibles parametros: (limite, desde), sucursal, estado, turno
//por defecto: durante 15 dias, de todas las sucursales, con estado abierto y cerrado, en todos los turnos
//sucursal:el id de sucursal
//valores para estado: cerrados, abiertos
//valores para turnos: manana, tarde, noche
router.get('/obtenerCabecerasInventario',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
], obtenerCabecerasInventario);

//FIXME: para calcular las diferencias entre el inventario y la rendicion registrada. Obtner informacion 
router.get('/obtenerCalculos/:idCabecera',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),    
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerCalculo);

//FIXME: listar las cantidades de apertura y cierre de cada producto
router.get('/obtenerDetalleInventario/:idCabecera',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleInventario);

//FIXME: listar las cantidades de apertura y cierre de dinero
router.get('/obtenerDetalleRendicion/:idCabecera',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleRendicion);


//FIXME: obtener todas las recepciones que tuvo un producto durante una rendicion
router.get('/obtenerDetalleRecepcion',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    validarCampos
], obtenerDetalleRecepcion);

//FIXME: obtener todos los registros del detalle de recepcion durante la vigencia de un inventario
//para listar las recepciones de todos los productos y diferenciando los registros del detalle a cual 
//cabecera de recepcion corresponden mediante el nro de Comprobante
router.get('/obtenerRecepciones',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    validarCampos
], obtenerRecepciones);


//FIXME: obtener todas las salidas que tuvo un producto durante una rendicion
router.get('/obtenerDetalleSalida',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    validarCampos
],  obtenerDetalleSalida); 

//FIXME: obtener todos los registros del detalle de salidas durante la vigencia de un inventario
//para listar las salidas de todos los productos; diferenciando los registros del detalle a cual 
//cabecera de salida corresponden mediante los idcsalida
router.get('/obtenerSalidas',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerSalidas); 

//FIXME: Este end point se utiliza para modificar la cantidad de apertura y cierre de un producto que se ha registrado en el detalle de inventario    
router.put('/editarCantidadProducto/:idCabecera/:idProducto',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    //falta validar que la cantidad de cierre y apertura sean obligatorias
    validarCampos
],  editarCantidadProducto); 

//FIXME: Permite modificar el precio de un producto que fue registrado en el detalle de inventario el cual pertenece a una cabecera de inventario
router.put('/editarPrecioProducto/:idCabecera/:idProducto',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    validarCampos
],  editarPrecioProducto); 

//FIXME: si se necesita editar varias cantidades del detalle de inventario de una sola vez se utilizara este endpoint
//tanto si se necesitan editar solo las aperturas o solo los cierres o ambos
//porque todos los datos se envian de una sola vez
router.put('/editarCantidadesProductos/:idCabecera',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  editarCantidadesProductos); 

//FIXME: ESTOS END POINT SE UTILIZARAN PARA LA EDICION DE RECEPCIONES

//	Para obtener cabeceras de recepciones (ya existía uno, pero agregue este para que sean independientes) 
router.get('/obtenerCabecerasRecepciones/:idCabecera',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerCabecerasRecepciones); 

//	Obtener el detalle de una cabecera de recepción (ya existía uno, pero agregue este para que sean independientes)
router.get('/obtenerDetalleRecepcionCab/:idCabecera/:idCabeceraRec',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
     check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleRecepcionCab); 

//Permite cambiar el estado de la cabecera de una recepción(activo a inactivo o viceversa) y al mismo tiempo actualizar el campo “cantidadRecepcion”
router.delete('/modificarEstadoRecepcion/:idCabRecepcion',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    //  check('idCabecera').custom(existeCabInventario),
    validarCampos
],  modificarEstadoRecepcion); 

//para registrar mas recepciones que pertenecen a un inventario
router.post('/registrarMasRecepcion/:idCabecera',[
    validarJWT, tieneRol( 'ADMINISTRADOR', 'ROOT'),
], registrarMasRecepcion);


//FIXME: LOS SIGUIENTES ENDPOINTS SE UTILIZARAN PARA MODIFICAR SALIDAS4

//-	Para obtener cabeceras de salidas (ya existía uno, pero agregue este para que sean independientes) 
router.get('/obtenerCabecerasSalidas/:idCabecera',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerCabecerasSalidas); 

router.get('/obtenerDetalleSalidaCab/:idCabecera/:idCabeceraSal',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
     check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleSalidaCab); 

router.delete('/modificarEstadoSalida/:idCabeceraSal',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    //  check('idCabecera').custom(existeCabInventario),
    validarCampos
],  modificarEstadoSalida); 

router.post('/registrarMasSalida/:idCabecera',[
    validarJWT, tieneRol( 'ADMINISTRADOR', 'ROOT'),
], registrarMasSalida);

//todo.prueba para java (NO TERMINADO)
router.get('/pruebaGetParaJava', [
    // validarJWT,
    // tieneRol('ADMINISTRADOR', 'ROOT'),
    //todo falta verificar existencia de fechas sucursal y turnos
    // check('id').custom(existeCabInventario),
    validarCampos
], pruebaGetParaJava);

module.exports = router;




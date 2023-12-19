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

router.get('/obtenerSalidas',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerSalidas); 

router.put('/editarCantidadProducto/:idCabecera/:idProducto',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    validarCampos
],  editarCantidadProducto); 

router.put('/editarPrecioProducto/:idCabecera/:idProducto',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    validarCampos
],  editarPrecioProducto); 

router.put('/editarCantidadesProductos/:idCabecera',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  editarCantidadesProductos); 


//todo: para recepciones

router.get('/obtenerCabecerasRecepciones/:idCabecera',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerCabecerasRecepciones); 

router.get('/obtenerDetalleRecepcionCab/:idCabecera/:idCabeceraRec',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
     check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleRecepcionCab); 

router.delete('/modificarEstadoRecepcion/:idCabRecepcion',[
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'), 
    //  check('idCabecera').custom(existeCabInventario),
    validarCampos
],  modificarEstadoRecepcion); 

router.post('/registrarMasRecepcion/:idCabecera',[
    validarJWT, tieneRol( 'ADMINISTRADOR', 'ROOT'),
], registrarMasRecepcion);



//todo: para salidas

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

//todo.prueba para java
router.get('/pruebaGetParaJava', [
    // validarJWT,
    // tieneRol('ADMINISTRADOR', 'ROOT'),
    //todo falta verificar existencia de fechas sucursal y turnos
    // check('id').custom(existeCabInventario),
    validarCampos
], pruebaGetParaJava);

module.exports = router;




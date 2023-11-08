//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { obtenerCabecerasInventario, obtenerDetalleRecepcion, obtenerDetalleSalida, obtenerDetalleRendicion, obtenerDetalleInventario, obtenerCalculo } = require('../controllers/inventariosRegistrados');
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
    tieneRol('ADMIN', 'ROOT'),
], obtenerCabecerasInventario);

//FIXME: para calcular las diferencias entre el inventario y la rendicion registrada. Obtner informacion 
router.get('/obtenerCalculos/:idCabecera',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),    
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerCalculo);

//FIXME: listar las cantidades de apertura y cierre de cada producto
router.get('/obtenerDetalleInventario/:idCabecera',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleInventario);

//FIXME: listar las cantidades de apertura y cierre de dinero
router.get('/obtenerDetalleRendicion/:idCabecera',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleRendicion);


//FIXME: obtener todas las recepciones que tuvo un producto durante una rendicion
router.get('/obtenerDetalleRecepcion',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    validarCampos
], obtenerDetalleRecepcion);

//FIXME: obtener todas las salidas que tuvo un producto durante una rendicion
router.get('/obtenerDetalleSalida',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'), 
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    validarCampos
],  obtenerDetalleSalida); 

module.exports = router;




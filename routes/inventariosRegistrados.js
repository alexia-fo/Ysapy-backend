const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol, esAdminRol } = require('../middlewares/validar-roles');
const { obtenerCalculoRendicion, obtenerCabecerasInventario, obtenerDetalleRecepcion, obtenerDetalleSalida, obtenerDetalleRendicion, obtenerRendicion, obtenerDetalleInventario, obtenerCalculo } = require('../controllers/inventariosRegistrados');
const { existeCabInventario, existeProducto } = require('../helpers/db-validators');

const router = Router();

//para listar las cabeceras de inventario
//posibles parametros: (limite, desde), sucursal, estado, turno
//por defecto: durante 15 dias, de todas las sucursales, con estado abierto y cerrado, en todos los turnos
//sucursal:el id de sucursal
//valores para estado: cerrados, abiertos
//valores para turnos: manana, tarde, noche

//FIXME:para ambos
router.get('/obtenerCabecerasInventario',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
], obtenerCabecerasInventario);

//TODO:inicio de consulta para detalles en unsa sola pagina
router.get('/obtenerCalculoRendicion/:idCabecera',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerCalculoRendicion);

//Para ver los detalles de inventario y de rendicion de las cabeceras que no tienen un cierre completado
router.get('/obtenerRendicion/:idCabecera',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    
    check('idCabecera').custom(existeCabInventario),
    validarCampos
], obtenerRendicion);
//TODO:fin

//FIXME: para consulta para detalles separados

router.get('/obtenerDetalleInventario/:idCabecera',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleInventario);

router.get('/obtenerDetalleRendicion/:idCabecera',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerDetalleRendicion);

///
router.get('/obtenerCalculos/:idCabecera',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    
    check('idCabecera').custom(existeCabInventario),
    validarCampos
],  obtenerCalculo);

//FIXME:

//
router.get('/obtenerDetalleRecepcion',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    
    check('idCabecera').custom(existeCabInventario),
    check('idProducto').custom(existeProducto),
    validarCampos
], obtenerDetalleRecepcion);

//
router.get('/obtenerDetalleSalida', obtenerDetalleSalida); 

module.exports = router;




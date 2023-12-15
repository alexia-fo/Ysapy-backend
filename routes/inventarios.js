//!FUNCIONARIO

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const {dinerosRendicion, verExisteApertura,sucDeUsurio, crearApertura, registrarRendicion, registrarInventario, verificarInventario, verificarRendicion, productosInventario, obtenerProductoPorId, controlMegas } = require('../controllers/inventario');
const { apeturaDisponible } = require('../helpers/db-validators');

const router = Router();

//FIXME: para recepciones y salidas, buscar producto cuando se desenfoca en el campo idProducto
router.get('/producto/:id',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], obtenerProductoPorId);

//FIXME: para verificar si se puede realizar una apertura en la cabecera de inventario
router.get('/verExisteApertura',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], verExisteApertura);

//FIXME: para visualizar la sucursal en la ventana de apertura de inventario
router.get('/sucDeUsuario',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], sucDeUsurio);

//FIXME: para registrar la apertura en la cabecera de inventario
router.post('/crearApertura',[
    validarJWT,
    tieneRol('FUNCIONARIO'),
    apeturaDisponible,
    validarCampos
], crearApertura);

//PARA DETALLE DE INVENTARIO
//FIXME: verificar que el inventario este disponible: si es una apertura 
//que exista una cabecera, si es un cierre que ya exista la apertura del detalle de rendicion
router.get('/verificarInventario',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], verificarInventario);

//FIXME:listado de productos para registrar el inventario
router.get('/productosInventario',[
    validarJWT, 
    tieneRol('FUNCIONARIO', 'ROOT', 'ADMINISTRADOR'),
], productosInventario);

//FIXME: para registrar el detalle del inventario
router.post('/registrarInventario',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], registrarInventario);

//PARA DETALLE DE RENDICION
//FIXME: verificar que la rendicion este disponible: si es una apertura 
//que exista una cabecera, si es un cierre que ya exista la apertura del detalle de inventario
router.get('/verificarRendicion',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], verificarRendicion);

//FIXME:listado de dineros para registrar la rendicion
router.get('/dinerosRendicion',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], dinerosRendicion);

//FIXME: para registrar el detalle de la rendicion
router.post('/registrarRendicion',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], registrarRendicion);

//PARA QUE EL FUNCIONARIO VISUALICE 
//FIXME: para que el usuario visualice el inventario del día que ya ha registrado. POR AHORA DESHABILITADO
// router.get('/visualizarInventario',[
//     validarJWT, 
//     tieneRol('FUNCIONARIO'),
// ], visualizarInventario);


router.put('/controlMegas',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], controlMegas);

module.exports = router;

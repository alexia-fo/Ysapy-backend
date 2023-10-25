/////////// PARA EMPLEADOS  ///////////
const { Router } = require('express');
const { check } = require('express-validator');
//const { existeClasificacion } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const {dinerosRendicion, verExisteApertura,sucDeUsurio, crearApertura, registrarRendicion, registrarInventario, verificarInventario, verificarRendicion, productosInventario, obtenerProductoPorId, visualizarInventario } = require('../controllers/inventario');
const { apeturaDisponible } = require('../helpers/db-validators');

const router = Router();

//!PARA OBTENER PRODUCTO EN RECEPCION Y SALIDA AL PRESIONAR ENTER EN ID
router.get('/producto/:id',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], obtenerProductoPorId);

//! -- SOLO PARA SERVICIOS DE FUNICIONARIO (cabecera de inventario, detalle de inventario, rendicion de caja)--

//PARA CABECERA
router.get('/verExisteApertura',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], verExisteApertura);

router.get('/sucDeUsuario',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], sucDeUsurio);

router.post('/crearApertura',[
    validarJWT,
    tieneRol('FUNCIONARIO'),
    apeturaDisponible,
    //validarCampos
], crearApertura);


//PARA DETALLE DE INVENTARIO
router.get('/verificarInventario',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], verificarInventario);

router.get('/productosInventario',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], productosInventario);

router.post('/registrarInventario',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], registrarInventario);


//PARA DETALLE DE RENDICION
router.get('/verificarRendicion',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], verificarRendicion);

router.get('/dinerosRendicion',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], dinerosRendicion);

router.post('/registrarRendicion',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], registrarRendicion);

//PARA QUE EL FUNCIONARIO VISUALICE 

router.get('/visualizarInventario',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], visualizarInventario);


module.exports = router;

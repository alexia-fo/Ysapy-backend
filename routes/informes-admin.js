//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { existeCabInventario } = require('../helpers/db-validators');
const { obtenerDetalleInventario, obtenerVentas, obtenerRendicion, obtenerSalidas, obtenerRecepciones, inventariosConsecutivos, comparacionRendiciones } = require('../controllers/informes-admin');

const router = Router();

router.get('/obtenerRendicion/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerRendicion);

router.get('/obtenerDetalleInventario/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerDetalleInventario);

router.get('/obtenerSalidas/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerSalidas);

router.get('/obtenerRecepciones/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerRecepciones);

router.get('/obtenerVentasInventario/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerVentas);

router.get('/inventariosConsecutivos', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    // falta verificar existencia de fechas sucursal y turnos

    validarCampos
], inventariosConsecutivos);

router.get('/comparacionRendiciones', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    // falta verificar existencia de fechas sucursal y turnos
    validarCampos
], comparacionRendiciones);

module.exports = router;

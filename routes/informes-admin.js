//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { emailExiste, existeUsuarioPorId, existeRol, existeSucursal, existeCabInventario } = require('../helpers/db-validators');
const { generarPDF, generarPDF2, obtenerDetalleInventario, obtenerPdfDetalleInventario, obtenerVentas, obtenerRendicion } = require('../controllers/informes-admin');

const router = Router();

router.get('/generarpdf', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    validarCampos
], generarPDF);

router.get('/generarpdf2', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    validarCampos
], obtenerPdfDetalleInventario
);

router.get('/obtenerDetalleInventario/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerDetalleInventario);

router.get('/obtenerVentasInventario/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerVentas);

router.get('/obtenerRendicion/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerRendicion);

module.exports = router;

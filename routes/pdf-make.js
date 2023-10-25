const { Router } = require('express');
const { check } = require('express-validator');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol, esAdminRol } = require('../middlewares/validar-roles');
const { generarPDF, generarPDF2, pdfCabecerasInventario } = require('../controllers/pdf-make');
const { validarCampos } = require('../middlewares/validar-campos');

const router = Router();

// obtener todas las clasficaciones
router.get('/productos'/*, [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    validarCampos
]*/, generarPDF);


router.get('/productos2'/*, [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    validarCampos
]*/, generarPDF2);


// obtener todas las clasficaciones
router.get('/pdfCabecerasInventario'/*, [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    validarCampos
]*/, pdfCabecerasInventario);

module.exports = router;




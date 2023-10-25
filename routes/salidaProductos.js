const { Router } = require('express');
const { check } = require('express-validator');
//const { existeClasificacion } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { registrarSalida, verExisteApertura, tiposSalida, visualizarSalidas, visualizacionDisponible } = require('../controllers/salidaProductos');

const router = Router();

//////EMPLEADO
router.get('/verExisteApertura',[validarJWT,], verExisteApertura);
router.get('/visualizacionDisponible',[validarJWT,], visualizacionDisponible);
router.post('/registrarSalida',[validarJWT,], registrarSalida);

router.get('/tiposSalida', tiposSalida);
// router.get('/productosSalida',[validarJWT,], productosSalida);
router.get('/visualizarSalidas',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], visualizarSalidas);

module.exports = router;


const { Router } = require('express');
const { check } = require('express-validator');
//const { existeClasificacion } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { registrarRecepcion, verExisteApertura, visualizarRecepciones, visualizacionDisponible  } = require('../controllers/recepcion');

const router = Router();


// router.get('/productosRecepcion',[validarJWT,], productosRecepcion);
router.get('/verExisteApertura',[validarJWT,], verExisteApertura);
router.get('/visualizacionDisponible',[validarJWT,], visualizacionDisponible);
router.post('/registrarRecepcion',[validarJWT,], registrarRecepcion);


router.get('/visualizarRecepciones',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], visualizarRecepciones);



module.exports = router;




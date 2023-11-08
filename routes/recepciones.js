const { Router } = require('express');
const { check } = require('express-validator');
//const { existeClasificacion } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { registrarRecepcion, verExisteApertura, visualizarRecepciones, visualizacionDisponible  } = require('../controllers/recepcion');

const router = Router();


//FIXME: para verificar si es posible registrar recepciones
router.get('/verExisteApertura',[validarJWT, tieneRol('FUNCIONARIO'),], verExisteApertura);
//FIXME: para habilitar la ventana que permite visualizar las recepciones
router.get('/visualizacionDisponible',[validarJWT, tieneRol('FUNCIONARIO'),], visualizacionDisponible);
//FIXME: registrar las recepciones (tanto cabecera como detalle)
//parametros: observacion, nroComprobante, productos
router.post('/registrarRecepcion',[validarJWT, tieneRol('FUNCIONARIO'),], registrarRecepcion);

//FIXME: para que el usuario visualice el detalle de las recepciones que ya ha registrados
router.get('/visualizarRecepciones',[
    validarJWT, 
    tieneRol('FUNCIONARIO'),
], visualizarRecepciones);



module.exports = router;




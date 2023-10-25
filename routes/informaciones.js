//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { productosGet, crearProducto, productoPut, productoDelete } = require('../controllers/productos');
const { existeClasificacion, existeProducto, productoExiste, existeInformacion } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { crearInformacion, informacionesGet, informacionPut, informacionDelete } = require('../controllers/informacion');

const router = Router();

//obtener productos o verificar si el nombre del producto se encuentra disponible
//posibles parametros:(desde, limite), nombre
router.get('/', informacionesGet);

router.post('/', [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('titulo', 'El titulo es obligatorio').not().isEmpty(),
    check('descripcion', 'La descripcion es obligatoria').not().isEmpty(),
    // check('fecha', 'La fecha es obligatoria').not().isEmpty(),
    validarCampos
], crearInformacion);

router.put('/:id',[    
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('id').custom( existeInformacion ),
    check('titulo', 'El titulo es obligatorio').not().isEmpty(),
    check('descripcion', 'La descripcion obligatoria').not().isEmpty(),
    // check('fecha', 'La fecha es obligatoria').not().isEmpty(),
    validarCampos
] ,informacionPut);

router.delete('/:id', [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('id').custom(existeInformacion),
    validarCampos
], informacionDelete);

module.exports = router;

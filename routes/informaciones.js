//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { productosGet, crearProducto, productoPut, productoDelete } = require('../controllers/productos');
const { existeClasificacion, existeProducto, productoExiste, existeInformacion } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { crearInformacion, informacionesGet, informacionPut, informacionDelete, informacionesGetAdmin } = require('../controllers/informacion');

const router = Router();

//FIXME: para listar informaciones a funcionarios y administradores en la ventana de informaciones a mostarar 
//posibles parametros:(desde, limite) en query
router.get('/', informacionesGet);

//FIXME: para listar informaciones en la tabla de abmc de admin
//posibles parametros:(desde, limite) en query
router.get('/admin', informacionesGetAdmin);

//FIXME: guardar una nueva información, posibles parametros (titulo, descripcion, fecha) en body
router.post('/admin', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('titulo', 'El titulo es obligatorio').not().isEmpty(),
    check('descripcion', 'La descripcion es obligatoria').not().isEmpty(),
    // check('fecha', 'La fecha es obligatoria').not().isEmpty(),
    validarCampos
], crearInformacion);

//FIXME: para actualizar las informaciones (sin su imagen)
//los datos incluidos en 'resto' son titulo, descripcion,fecha que es opcional; en el body

router.put('/admin/:id',[    
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom( existeInformacion ),
    check('titulo', 'El titulo es obligatorio').not().isEmpty(),
    check('descripcion', 'La descripcion obligatoria').not().isEmpty(),
    // check('fecha', 'La fecha es obligatoria').not().isEmpty(),
    validarCampos
] ,informacionPut);

//FIXME: para eliminar la informacion
router.delete('/admin/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeInformacion),
    validarCampos
], informacionDelete);

module.exports = router;

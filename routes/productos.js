//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { productosGet, crearProducto, productoPut, productoDelete } = require('../controllers/productos');
const { existeClasificacion, existeProducto, productoExiste } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');

const router = Router();

//obtener productos o verificar si el nombre del producto se encuentra disponible
//posibles parametros:(desde, limite), nombre
router.get('/', productosGet);

router.post('/', [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('precio', 'El precio es obligatorio').not().isEmpty(),
    //la descripcion no es obligatoria
    check('idclasificacion', 'La clasificacion es obligatoria').not().isEmpty(),
    check('idclasificacion').custom( existeClasificacion ),
    check('nombre').custom( productoExiste),
    validarCampos
], crearProducto);

router.put('/:id',[    
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('id').custom( existeProducto ),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('precio', 'El precio es obligatorio').not().isEmpty(),
    //la descripcion no es obligatoria
    check('idclasificacion', 'La clasificacion es obligatoria').not().isEmpty(),
    check('idclasificacion').custom( existeClasificacion ),
    check('facturable', 'Facturable obligatorio').not().isEmpty(),
    validarCampos
] ,productoPut);

router.delete('/:id', [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('id').custom(existeProducto),
    validarCampos
], productoDelete);

module.exports = router;

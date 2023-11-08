//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { productosGet, crearProducto, productoPut, productoDelete } = require('../controllers/productos');
const { existeClasificacion, existeProducto, productoExiste } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');

const router = Router();

//FIXME: obtener productos o verificar si el nombre del producto se encuentra disponible
//posibles parametros:(desde, limite), nombre
//si se envia el parametro nombre se verifica si el producto ya se encuentra registrado, se utiliza cuando se registra o actualiza un producto
//si no se envia el parametro nombre, se retorna un listado de productos CON o SIN limite y desde
router.get('/', productosGet);

//FIXME: crear producto (sin la imagen del producto que se actualiza independiente), el producto es facturable por defecto
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

//FIXME: se actualiza los datos del producto, sin la imagen que se modifica de manera independiente
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

//FIXME: eliminar producto
router.delete('/:id', [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('id').custom(existeProducto),
    validarCampos
], productoDelete);

// router.get('/:id', [
//     validarJWT,
//     tieneRol('ADMIN', 'ROOT'),
//     check('id').custom(existeProducto),
//     validarCampos
// ], obtenerProducto);

module.exports = router;

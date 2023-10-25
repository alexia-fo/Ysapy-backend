const { Router } = require('express');
const { check } = require('express-validator');
//const { existeClasificacion } = require('../helpers/db-validators');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { sucursalesGet, crearSucursal, sucursalPut, sucursalDelete } = require('../controllers/sucursal');
const { existeSucursal } = require('../helpers/db-validators');

const router = Router();




// obtener todas las clasficaciones
router.get('/', sucursalesGet);

//crear categoria - privadada - cualquier persona con un token valido
router.post('/', [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    validarCampos
], crearSucursal);

//modificar una clasificacion- privado
router.put('/:id',[
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('id').custom( existeSucursal ),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    validarCampos
] ,sucursalPut);

//borrar una clasificacion- privado - solo un admin
router.delete('/:id', [
    validarJWT,
    tieneRol('ADMIN', 'ROOT'),
    check('id').custom(existeSucursal),
    validarCampos
], sucursalDelete);








module.exports = router;

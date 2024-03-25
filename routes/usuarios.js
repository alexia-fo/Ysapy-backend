//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { emailExiste, existeUsuarioPorId, existeRol, existeSucursal } = require('../helpers/db-validators');
const {usuariosGet, usuariosPut, usuariosPost, usuariosDelete, cambiarContrasena, obtenerUsuario} = require('../controllers/usuarios');

const router = Router();

router.put('/cambiarContra/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeUsuarioPorId),
    check('nuevaContrasena', 'La contraseña es obligaria, y debe tener más de 5 digitos').isLength({min: 5}),
    validarCampos
],cambiarContrasena);

//obtener los usuarios o verificar si el correo del usuario se encuentra disponible
//posibles parametros:(desde, limite), correo
router.get('/', usuariosGet);


router.post('/',[
    validarJWT,
    tieneRol('ROOT'),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('nusuario', 'El usuario es obligatorio').not().isEmpty(),
    check('contra', 'La contraseña es obligaria, y debe tener más de 5 digitos').isLength({min: 5}),
    check('correo', 'El correo no es valido').isEmail(),
    check('correo').custom( emailExiste),
    check('idrol', 'El rol es obligatorio').not().isEmpty(),
    check('idsucursal', 'La sucursal es obligatoria').not().isEmpty(),
    check('idrol').custom( existeRol ),
    check('idsucursal').custom( existeSucursal ),
    check('turno').isIn(['M', 'T', 'N', '']),
    //add 
    check('categoria').isIn(['V', 'C', 'F', null]),//para usuarios con rol FUNCIONARIO los valores son C, V, F y para admin y root su valor es null
    validarCampos
] ,usuariosPost);

router.put('/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeUsuarioPorId),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    // check('contra', 'La contraseña es obligaria, y debe tener más de 5 digitos').isLength({min: 5}),
    check('correo', 'El correo no es valido').isEmail(),
    // check('correo').custom( emailExiste),
    check('idrol', 'El rol es obligatorio').not().isEmpty(),
    check('idrol').custom( existeRol ),
    check('idsucursal', 'La sucursal es obligatoria').not().isEmpty(),    
    check('idsucursal').custom( existeSucursal ),
    check('turno').isIn(['M', 'T', 'N', '']),
//add
    check('categoria').isIn(['V', 'C', 'F', null]),//para usuarios con rol FUNCIONARIO los valores son C, V, F y para admin y root su valor es null

    validarCampos
],usuariosPut);

router.delete('/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeUsuarioPorId),
    validarCampos
], usuariosDelete);

router.get('/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeUsuarioPorId),
    validarCampos
], obtenerUsuario);

module.exports = router;

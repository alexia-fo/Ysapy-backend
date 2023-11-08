const { Router } = require('express');
const { check } = require('express-validator');
const { login, googleSignIn, retornarPerfil } = require('../controllers/auth');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

router.post('/login', [
    check('correo','El correo es obligatorio').isEmail(),
    check('contra','La contraseña es obligatoria').not().isEmpty(),
    validarCampos

], login);

router.post('/google', [
    check('id_token','Id_Token de google es necesario').not().isEmpty(),
    validarCampos
], googleSignIn);

//FIXME: retorna el perfil en base al token
router.get('/retornarPerfil', [
    validarJWT
], retornarPerfil);

// router.get('/crearPrimerUsuario', [
// ], crearPrimerUsuario);

module.exports = router;

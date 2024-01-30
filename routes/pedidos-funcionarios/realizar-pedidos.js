const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../../middlewares/validar-campos');
const { validarJWT } = require('../../middlewares/validar-jwt');
const { tieneRol } = require('../../middlewares/validar-roles');
const { registrarPedido, marcasGet, productosGet, verHabilitacion, turnosGet, verHorarioHabilitado, pedidoGet, editarPedido,  } = require('../../controllers/pedidos-funcionarios/realizar-pedidos');
const { existeMarca } = require('../../helpers/db-validators');

const router = Router();

router.get('/verHorarioHabilitado', verHorarioHabilitado);

// router.get('/verHabilitacion',[
//     validarJWT,
//     tieneRol('FUNCIONARIO'),
// ], verHabilitacion);

router.get('/marcas',[
    validarJWT,
    tieneRol('FUNCIONARIO','ADMINISTRADOR', 'ROOT'),
], marcasGet);

router.get('/turnos',[
    validarJWT,
    tieneRol('FUNCIONARIO', 'ADMINISTRADOR', 'ROOT'),
], turnosGet);

router.get('/productos/:idMarca',[
    validarJWT,
    tieneRol('FUNCIONARIO'),
    check('idMarca').custom( existeMarca ),
    validarCampos
], productosGet);

router.post('/registrarPedido',[
    validarJWT,
    tieneRol('FUNCIONARIO'),
    check('marca').custom( existeMarca ),
    check('fechaEntrega', 'La fecha de Entrega es obligatoria').not().isEmpty(),
    validarCampos
], registrarPedido);


router.get('/pedidoGet/:idCabecera',[
    validarJWT,
    tieneRol('FUNCIONARIO'),
    // check('idCabecera').custom( existeMarca ),
    validarCampos
], pedidoGet);

router.put('/editarPedido/:idCabecera',[
    validarJWT,
    tieneRol('FUNCIONARIO'),
    // check('idCabecera').custom( existeMarca ),
    validarCampos
], editarPedido
);

module.exports = router;


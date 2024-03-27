//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../../middlewares/validar-campos');
const { validarJWT } = require('../../middlewares/validar-jwt');
const { tieneRol } = require('../../middlewares/validar-roles');
const { verCabecerasPedidosEnviados, verDetalleCabPedidosEnviadosPDF, verTotalPedidosEnviadosPDF, verTotalPedidosRecibidosPDF, verCabecerasPedidosRecibidos, verDetalleCabPedidosRecibidosPDF, verPedidosPorSucursalYmarcaPDF, verPedidosPorSucursalYmarcaPDFconHora } = require('../../controllers/pedidos-funcionarios/ver-pedidos');
const { existeCabPedido } = require('../../helpers/db-validators');

const router = Router();

//para estos no es necesario establecer marcas pq obtienen los que guardo el usuario
//todo:utilizado
router.get('/verCabecerasPedidosEnviados', [
    validarJWT,
    tieneRol('FUNCIONARIO'),

], verCabecerasPedidosEnviados);

//todo:utilizado
router.get('/verDetalleCabPedidosEnviadosPDF/:idCabecera', [
    validarJWT,
    tieneRol('FUNCIONARIO'),
    check('idCabecera').custom(existeCabPedido),
    validarCampos
], verDetalleCabPedidosEnviadosPDF);

router.get('/verTotalPedidosEnviadosPDF', [
    validarJWT,
    tieneRol('FUNCIONARIO'),
], verTotalPedidosEnviadosPDF);

//!PEDIDOS RECIBIDOS

//todo:utilizad
router.get('/verTotalPedidosRecibidosPDF', [
    validarJWT,
    tieneRol('FUNCIONARIO', 'ADMINISTRADOR', 'ROOT'),
], verTotalPedidosRecibidosPDF);

router.get('/verCabecerasPedidosRecibidos', [
    validarJWT,
    tieneRol('FUNCIONARIO', 'ADMINISTRADOR', 'ROOT'),
], verCabecerasPedidosRecibidos);

router.get('/verDetalleCabPedidosRecibidosPDF/:idCabecera', [
    validarJWT,
    tieneRol('FUNCIONARIO','ADMINISTRADOR', 'ROOT'),
    check('idCabecera').custom(existeCabPedido),
    validarCampos
], verDetalleCabPedidosRecibidosPDF);

//todo:utilizad
router.get('/verPedidosPorSucursalYmarcaPDF', [
    validarJWT,
    tieneRol('FUNCIONARIO','ADMINISTRADOR', 'ROOT'),
], verPedidosPorSucursalYmarcaPDF);

//todo:utilizad 
router.get('/verPedidosPorSucursalYmarcaPDFconHora', [
    validarJWT,
    tieneRol('FUNCIONARIO','ADMINISTRADOR', 'ROOT'),
], verPedidosPorSucursalYmarcaPDFconHora);

module.exports = router;

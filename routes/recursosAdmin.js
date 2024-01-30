//!ADMINISTRACION

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { tieneRol } = require('../middlewares/validar-roles');
const { existeCabInventario } = require('../helpers/db-validators');
const { obtenerVentasCSV } = require('../controllers/recursos-admin');

const router = Router();

router.get('/obtenerVentasCSV/:id', [
    validarJWT,
    tieneRol('ADMINISTRADOR', 'ROOT'),
    check('id').custom(existeCabInventario),
    validarCampos
], obtenerVentasCSV);

router.get('/obtenerVentas/:id',(req, res)=>{
    console.log("hola mundo")
    res.json({msg:"hoal"})
} );

module.exports = router;

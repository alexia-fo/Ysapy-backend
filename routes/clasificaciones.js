//!ADMINISTRACION
const { Router } = require('express');
const { clasificacionesGet  } = require('../controllers/clasificaciones');

const router = Router();

//FIXME:para abmc de productos en modulo administracion
router.get('/', clasificacionesGet);

// Obtener una clasificacion
// router.get('/:id', [
//     check('id').custom( existeClasificacion )
// ], clasificacionGet);

//crear categoria - privadada - cualquier persona con un token valido
// router.post('/', [
//     validarJWT,
//     tieneRol('ADMIN', 'ROOT'),
//     check('nombre', 'El nombre es obligatorio').not().isEmpty(),
//     validarCampos
// ], crearClasificacion);

//modificar una clasificacion- privado
// router.put('/:id',[
//     validarJWT,
//     check('id').custom( existeClasificacion ),
//     check('nombre', 'El nombre es obligatorio').not().isEmpty(),
//     validarCampos
// ] ,clasificacionPut);

//borrar una clasificacion- privado - solo un admin
// router.delete('/:id', [
//     validarJWT,
//     tieneRol('ADMIN', 'ROOT'),
//     check('id').custom(existeClasificacion),
//     validarCampos
// ], ClasificacionDelete);

//TODO: Para prueba de angulardatatable serverside
// router.get('/probando/serverside', clasificacionesServer);

module.exports = router;




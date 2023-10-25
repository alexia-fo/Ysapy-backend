const { response } = require('express');
const { Rol } = require('../model');


const esAdminRol = async (req, res = response, next) => {

    /*

    if(!req.usuario){
        return res.status(500).json({
            msg: 'Se quiere verificar el rol sin validar el token'
        });
    }

    const {rol, nombre}= req.usuario;

    if(rol !== 'ROOT') {
        return res.status(401).json({
            msg: `${ nombre } no es administrador - No tiene los permisos`
        })
    }

    next();

    */

    if(!req.usuario){
        return res.status(500).json({
            msg: 'Se quiere verificar el rol sin validar el token'
        });
    }

    const { nombre }= req.usuario;
    const rol = await Rol.findByPk(req.usuario.idrol);

    console.log('validar roles ', rol)

    if(rol.rol !== 'ROOT') {
        return res.status(401).json({
            msg: `${ nombre } no es administrador - No tiene los permisos`
        })
    }

    next();
}

const tieneRol = (...roles) => {

    /*

    return (req, res, next) => {
        if(!req.usuario){
            return res.status(500).json({
                msg: 'Se quiere verificar el rol sin validar el token'
            });
        }

        if(!roles.includes(req.usuario.rol )){
            return res.status(401).json({
                msg: `El servicio requiere un nivel de rol ${roles}`
            });
        }
        
        next();
    }

    */

    return async (req, res, next) => {
        if(!req.usuario){
            return res.status(500).json({
                msg: 'Se quiere verificar el rol sin validar el token'
            });
        }

        const rol = await Rol.findByPk(req.usuario.idrol);

        if(!roles.includes(rol.rol)){
            return res.status(401).json({
                msg: `El servicio requiere un nivel de rol ${roles}`
            });
        }
        
        next();
    }
}


module.exports={
    esAdminRol,
    tieneRol,
}


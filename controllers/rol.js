//!ADMINISTRACION

const { response } = require("express");
const {Rol, Usuario} = require('../model');

const rolesGet = async (req = request, res = response)=> {
    
    const  {limite} = req.query;
    const  {desde} = req.query;
    const  {tipo} = req.query;
    

    let condiciones;

    if(limite && desde){
        condiciones={
            offset: Number(desde),
            limit: Number(limite),
            where: {activo:true}
        }
    }else{
        condiciones={
            where: {activo:true}
        }
    }

    if(tipo){
        condiciones.where.tipo=tipo;
    }

    // con promesas
    const [total,rol] = await Promise.all([
        Rol.count({where: {activo:true}}),
        Rol.findAll({...condiciones
        })
    ]);

    res.json({
        total,
        rol
    });
    
}

module.exports = {
    rolesGet,
}
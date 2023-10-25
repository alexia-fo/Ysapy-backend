//!ADMINISTRACION

const { response } = require("express");
const {Sucursal, Usuario} = require('../model');

// para listado de sucursales en abmc de sucursales
const sucursalesGet = async (req = request, res = response)=> {
    let limite = req.query.limite;
    let desde = req.query.desde;

    try {
        if (!limite && !desde) {// si no se envian los parametros desde y limite se retornaran todos los registros
            // con promesas
            const [total,sucursal] = await Promise.all([
                Sucursal.count({where: {estado:true}}),
                Sucursal.findAll({
                    where: {estado:true},
                    include: [{ model: Usuario, attributes:[ 'nombre'] }]   // populate (traer datos de la tabla relacionada)
                })
            ]);
    
            res.json({
                total,
                sucursal
            });
        } else if (limite !== undefined && desde !== undefined) { //si se envia los parametros limite y desde, estos se utilizaran para tener en cuenta la cantidad de registros a retornar
            limite = parseInt(limite);
            desde = parseInt(desde);
    
            if (limite <= desde) {
                return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
            }
    
            // con promesas
            const [total,sucursal] = await Promise.all([
                Sucursal.count({where: {estado:true}}),
                Sucursal.findAll({
                    offset: desde,
                    limit: limite,
                    where: {estado:true},
                    include: [{ model: Usuario, attributes:[ 'nombre'] }]   // populate (traer datos de la tabla relacionada)
                })
            ]);
    
            res.json({
                total,
                sucursal
            });
        } else {
            return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener las sucursales" });
    }
    
}

const crearSucursal = async (req, res = response) => {
    try {

        const nombre = req.body.nombre.toUpperCase();

        const sucursalBD = await Sucursal.findOne({where: {nombre: nombre}});
    
        if(sucursalBD){
            return res.status(400).json({
                msg: `La sucursal ${sucursalBD.nombre}, ya existe `
            });
        }
    
        //Generar datos a guardar
    
        const data ={
            nombre,
            idusuario: req.usuario.idUsuario
        }
    
        const sucursal = new Sucursal(data);
    
        await sucursal.save();
    
            
        res.status(201).json(sucursal);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Error al registrar la sucursal" });
    }
}

const sucursalPut = async (req, res = response )=> {
    
    const {id} = req.params;
    const { estado, usuario, ...resto } = req.body; // se utiliza de esta forma para obviar los campos   

    try {
            
        resto.nombre = resto.nombre.toUpperCase();       
        resto.idusuario = req.usuario.idUsuario;

        const sucursal = await Sucursal.findByPk(id);
      
        await sucursal.update( resto );

        res.json(sucursal);
   } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: 'Error al actualizar el sucursal'
        });
   }
}


//Borrar clasificacion - estado: False
const sucursalDelete = async (req = request, res = response)=> {
    
    const { id } = req.params;
    
    const usuarioAutenticado = req.usuario;

    try {
        
        const sucursal = await Sucursal.findByPk(id);

        await sucursal.update({ estado: false, idUsuario: usuarioAutenticado}); // solo cambia el estado del usuario
       
        res.json({
             sucursal, 
             usuarioAutenticado // mostrar los datos del usuario autenticado
        });
        
   } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: 'Error al eliminar la sucursal'
        });
   }

}

module.exports = {
    crearSucursal,
    sucursalesGet,
    sucursalPut,
    sucursalDelete
}
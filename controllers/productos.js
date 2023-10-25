//!ADMINISTRACION

const { response } = require("express");
const {Clasificacion, Producto ,Usuario} = require('../model');
const { Op } = require("sequelize");

//obtener productos o verificar si el nombre del producto se encuentra disponible
const productosGet = async (req = request, res = response)=> {
    let limite = req.query.limite;
    let desde = req.query.desde;
    let nombre = req.query.nombre;

    try {
        //si se envia el parametro nombre se verifica si el producto ya se 
        //encuentra registrado, se utiliza cuando se registra o actualiza un producto
        //para verificar si el nombre se encuentra habilitado 
        if(nombre){
            nombre=nombre.toUpperCase();
            const existe = await Producto.findOne({
                where: { nombre }
            });
                    
            if(existe){
                res.json({
                    isAvailable:false
                })
            }else{       
                res.json({
                    isAvailable:true
                })  
            } 

        }else{//si no se envia el parametro nombre, se retorna un listado de productos

            if (!limite && !desde) {// si no se envian los parametros desde y limite se retornaran todos los registros
                const [total,producto] = await Promise.all([
                    Producto.count({where: {activo:true}}),
                    Producto.findAll({
                        where: {activo:true},
                        include: [{ model: Usuario, attributes:[ 'nombre'] },
                                    { model: Clasificacion, attributes: ['nombre']}]
                    })
                ]);
    
                res.json({
                    total,
                    producto
                });
            } else if (limite !== undefined && desde !== undefined) { //si se envia los parametros limite y desde, estos se utilizaran para tener en cuenta la cantidad de registros a retornar
                limite = parseInt(limite);
                desde = parseInt(desde);
    
                if (limite <= desde) {
                    return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
                }
    
                const [total,producto] = await Promise.all([
                    Producto.count({where: {activo:true}}),
                    Producto.findAll({
                        offset: desde,
                        limit: limite,
                        where: {activo:true},
                        include: [{ model: Usuario, attributes:[ 'nombre'] },
                                    { model: Clasificacion, attributes: ['nombre']}]   // populate (traer datos de la tabla relacionada)
                    })
                ]);
    
                res.json({
                    total,
                    producto
                });
            } else {
                return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
            }
        }
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los productos" });
    }

}

const crearProducto = async (req, res = response) => {
    
    try {
        
        const nombre = req.body.nombre.toUpperCase();
        let descripcion = req.body.descripcion;

        //la descripcion es opcional
        if (descripcion) {
            descripcion = descripcion.toUpperCase();
        }

        //Generar datos a guardar
        //img se actualiza por separado
        //facturable por defecto es verdadero
        //activo por defecto es verdadero
        const data ={
            idclasificacion: req.body.idclasificacion,
            nombre,
            descripcion,
            precio: req.body.precio,
            idusuario: req.usuario.idUsuario,
        }

        const producto = new Producto(data);

        await producto.save();

        res.status(201).json(producto);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Error al registrar el producto" });
    }
}

const productoPut = async (req, res = response )=> {
    
    const {id} = req.params;
    //activo y usuario se destructura para no actualizar los mismos (activo solo se actualiza a false cuando se elimina)
    //los datos incluidos en 'resto' son idclasificacion, precio, facturable
    // 'img' se actualiza por separado 
    const { nombre, descripcion, usuario, activo,  ...resto } = req.body;

    try {
        resto.nombre = nombre.toUpperCase();
        resto.idusuario = req.usuario.idUsuario;
        //la descripcion es opcional
        if(descripcion){
            resto.descripcion = descripcion.toUpperCase(); 
        }

        // para no repetir el nombre
        const productoBD = await Producto.findOne({
            where: {
                nombre: nombre,
                idProducto: {
                    [Op.ne]: id //que no sea del mismo id de producto
                }
            }
        });

        if(productoBD){
            return res.status(404).json({
                msg: `La categoría ${productoBD.nombre}, ya existe `
            });
        } 

        const producto = await Producto.findByPk(id);
    
        //Se actualiza: idclasificacion, precio, facturable, nombre, idusuario
        await producto.update( resto );
    
        res.json(producto);
   } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: 'Error al actualizar el producto'
        });
   }
}

const productoDelete = async (req = request, res = response)=> {
    
    const { id } = req.params;
    
    const usuarioAutenticado = req.usuario;


    try {
       const producto = await Producto.findByPk(id);

       await producto.update({ activo: false, idUsuario: usuarioAutenticado}); // solo cambia el estado del usuario

       res.json({
            producto, 
            usuarioAutenticado // mostrar los datos del usuario autenticado
        });
        
   } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Error al eliminar el producto'});
   }

}

module.exports = {
    crearProducto,
    productosGet,
    productoPut,
    productoDelete,
}
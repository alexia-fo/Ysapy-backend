//!FUNCIONARIO

const { Error } = require('sequelize');
const { Clasificacion, Producto, MenuSemanal, Sucursal, Rol, Usuario, Dinero, CInventario } = require('../model');
const { Op } = require('sequelize');
const sequelize = require('../db/conections');
//Para obtener la fecha segun una determinada zona horaria
const moment = require('moment-timezone');
const Informacion = require('../model/informacion');
const Marca = require('../model/marca');
const CPedidoFuncionario = require('../model/cPedidoFuncionario');
const zonaHorariaParaguay = 'America/Asuncion';



const esRoleValido = async (rol ='')  => {
    const existeRol =  await  Rol.findOne({where: { rol: rol }});
    if( !existeRol ){
        throw   new Error(`El ${rol} no esta registrado en la BD`);
    }
}

const emailExiste = async(correo = '')=> {
    // se verifica el correo del usuario
   const existeCorreo = await Usuario.findOne({ where: { correo: correo } });
   if(existeCorreo) {
       throw new Error(`El correo: ${correo}, ya esta registrado`);
   };
}

const productoExiste = async(nombre = '')=> {
    // se verifica el correo del usuario
   const existeProducto = await Usuario.findOne({ where: { nombre: nombre } });
   if(existeProducto) {
       throw new Error(`La categoría ${existeProducto.nombre}, ya existe `);
   };

}

const existeClasificacion = async(id)=> {
    // se verifica que exista el codigo
   const existeClasificacion = await Clasificacion.findByPk(id);
   
   if(!existeClasificacion){
      throw new Error(`El ID: ${id}, de clasificacion no existe en la BD`);
  };
}



const existeProducto = async(id)=> {
    // se verifica que exista el codigo
   const existeProducto = await Producto.findByPk(id);
   
   if(!existeProducto){
      throw new Error(`El ID: ${id}, del producto no existe en la BD`);
  };
}

const existeInformacion = async(id)=> {
    // se verifica que exista el codigo
   const existeInformacion = await Informacion.findByPk(id);
   
   if(!existeInformacion){
      throw new Error(`El ID: ${id}, de la informacion no existe en la BD`);
  };
}

// validar colecciones permitidas
const coleccionesPermitidas  = ( coleccion = '', colecciones = []) =>{

    const incluida = colecciones.includes(coleccion);
    if(!incluida){
        throw new Error(`La coleccion ${coleccion} no es permitida`);
    }
    return true;
}

//
const existeMenu = async(id)=> {
    // se verifica que exista el codigo
   const existeMenu = await MenuSemanal.findByPk(id);
   
   if(!existeMenu){
      throw new Error(`El ID: ${id}, de menu no existe en la BD`);
  };
}

const existeSucursal = async(id)=> {
    // se verifica que exista el codigo
   const existe = await Sucursal.findByPk(id);
   
   if(!existe){
      throw new Error(`El ID: ${id}, de sucursal no existe en la BD`);
  };
}

const existeRol = async(id)=> {
    // se verifica que exista el codigo
   const existe = await Rol.findByPk(id);
   
   if(!existe){
      throw new Error(`El ID: ${id}, de rol no existe en la BD`);
  };
}

const existeUsuarioPorId = async(id)=> {
    // se verifica que exista el codigo
   const existe = await Usuario.findByPk(id);
   
   if(!existe){
      throw new Error(`El ID: ${id}, de usuario no existe en la BD`);
  };
}

const existeDinero= async(id)=> {
    // se verifica que exista el codigo
   const existe = await Dinero.findByPk(id);
   
   if(!existe){
      throw new Error(`El ID: ${id}, del dinero no existe en la BD`);
  };
}


//v
const apeturaDisponible = async(req, res, next)=> {
    
    try {
        const idSucursal = req.usuario.idsucursal;
        const turno = req.usuario.turno;

        // Obtener la fecha actual según la zona horaria de Paraguay
        const fechaActual = moment().tz(zonaHorariaParaguay);
        // Formatear la fecha en formato ISO y obtener solo la parte de la fecha (sin hora)
        const fechaHoy = fechaActual.format('YYYY-MM-DD');

        //verificamos si ya exista la cabecera 
        const cabecera = await CInventario.findAll({
          where: {
            idsucursal: idSucursal,
            turno:turno,
            [Op.and]: sequelize.where(
                sequelize.fn('DATE', sequelize.col('fechaApertura')),
                fechaHoy
            ),
          },
        });
    
        if (cabecera.length > 0) {
            return res.status(409).json({ msg: 'Ya existe un inventario para la sucursal y turno actual.' });
        }
    
        // Si no existe la cabecera, se permite que el controlador se ejecute
        next();

    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: 'Error al verificar el inventario' });
    }

}

const existeCabInventario = async(id='')=> {
   const existeCabecera = await CInventario.findByPk(id);
   if(!existeCabecera) {
       throw new Error(`No se encontraron datos del Inventario `);
   };

}

const existeMarca = async(id)=> {
    // se verifica que exista el codigo
   const existeMarca = await Marca.findByPk(id);
   
   if(!existeMarca){
      throw new Error(`El ID: ${id}, de marca no existe en la BD`);
  };
}
const existeCabPedido = async(id)=> {
    // se verifica que exista el codigo
   const existePedido = await CPedidoFuncionario.findByPk(id);
   
   if(!existePedido){
      throw new Error(`El ID: ${id}, de pedido no existe en la BD`);
  };
}
module.exports = {
    esRoleValido,
    emailExiste,
    
    existeClasificacion,
    existeProducto,
    coleccionesPermitidas,
    existeMenu,
    existeSucursal,
    existeRol,
    existeDinero,

    apeturaDisponible,
    productoExiste,
    existeCabInventario,
    existeInformacion,
    existeUsuarioPorId,
    existeMarca,
    existeCabPedido
}
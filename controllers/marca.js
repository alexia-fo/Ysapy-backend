//!ADMINISTRACION

const { response } = require("express");
const Marca = require("../model/marca");

//FIXME: para obtener el listado de marcas para el combo en abmc de productos
const marcasGet = async (req = request, res = response) => {
    let limite = req.query.limite;
    let desde = req.query.desde;

    try {
        if (!limite && !desde) {
            const [total, marca] = await Promise.all([
                Marca.count(),
                Marca.findAll(),
            ]);

            res.json({
                total,
                marca,
            });
        } else if (limite !== undefined && desde !== undefined) {
            limite = parseInt(limite);
            desde = parseInt(desde);

            if (limite <= desde) {
                return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
            }

            const [total, marca] = await Promise.all([
                Marca.count(),
                Marca.findAll({
                    offset: desde,
                    limit: limite,
                }),
            ]);

            res.json({
                total,
                marca,
            });
        } else {
            return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Error al obtener las marcas" });
    }
};

module.exports = {
    marcasGet,
}